import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Routine, Exercise } from '../types';
import { parseMuscleGroups } from '../types';
import type { WorkoutDaySummary, WorkoutExerciseSummary } from '../lib/workoutHistory';
import {
  WORKOUT_CATEGORY_MET,
  getWorkoutCategoryMET,
  getUserBodyWeightKg,
  formatLocalDate,
  getWeekMonday,
  loadHistoryStore,
  saveHistoryStore,
  saveDayToHistory,
  buildWorkoutDaySummary,
} from '../lib/workoutHistory';

export type { WorkoutDaySummary, WorkoutExerciseSummary };
export { WORKOUT_CATEGORY_MET, getWorkoutCategoryMET };

/**
 * Fetches workout history for a given month/year.
 * Covers past weeks (from persistent storage & recurring routine plans),
 * the current week (live from routines & exercises), and future planned workouts.
 */
export function useWorkoutHistory(year: number, month: number) {
  const [history, setHistory] = useState<Map<string, WorkoutDaySummary>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Fetch current weekly plan (routines & exercises)
      const { data: routines } = await supabase
        .from('routines')
        .select('*')
        .order('day_index');

      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .order('order_index');

      const exercisesByRoutine = new Map<string, Exercise[]>();
      for (const ex of ((exercises as Exercise[]) ?? [])) {
        const list = exercisesByRoutine.get(ex.routine_id) ?? [];
        list.push(ex);
        exercisesByRoutine.set(ex.routine_id, list);
      }

      const routineByDayIndex = new Map<number, Routine>();
      for (const r of ((routines as Routine[]) ?? [])) {
        routineByDayIndex.set(r.day_index, r);
      }

      // 2. Load persistent history store (synced with Supabase & localStorage)
      const savedHistory = await loadHistoryStore();

      // 3. Determine current week's range (Monday to Sunday)
      const now = new Date();
      const currentMonday = getWeekMonday(now);
      const currentMondayStr = formatLocalDate(currentMonday);
      const currentSunday = new Date(currentMonday);
      currentSunday.setDate(currentMonday.getDate() + 6);
      const currentSundayStr = formatLocalDate(currentSunday);

      const bodyWeightKg = getUserBodyWeightKg();

      // 4. Calculate calendar grid dates for this view (startDow Monday = 0 to 6)
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);

      // Monday=0, Sunday=6
      let startDow = firstDayOfMonth.getDay() - 1;
      if (startDow < 0) startDow = 6;

      const gridStartDate = new Date(year, month, 1 - startDow);
      const totalDaysToShow = startDow + lastDayOfMonth.getDate();
      const rowsNeeded = Math.ceil(totalDaysToShow / 7);
      const totalCells = rowsNeeded * 7;
      const gridEndDate = new Date(gridStartDate);
      gridEndDate.setDate(gridStartDate.getDate() + totalCells - 1);

      const map = new Map<string, WorkoutDaySummary>();
      let hasStoreUpdates = false;

      // 5. Iterate through all dates displayed in the grid
      const iter = new Date(gridStartDate);
      while (iter <= gridEndDate) {
        const dateStr = formatLocalDate(iter);
        const dayOfWeekIndex = (iter.getDay() + 6) % 7; // Mon=0 ... Sun=6
        const routine = routineByDayIndex.get(dayOfWeekIndex);

        const isCurrentWeek = dateStr >= currentMondayStr && dateStr <= currentSundayStr;

        if (isCurrentWeek && routine) {
          const rExercises = exercisesByRoutine.get(routine.id) ?? [];
          const muscleGroups = parseMuscleGroups(routine.muscle_group);
          const isRest = muscleGroups.length === 1 && muscleGroups[0] === 'Rest';

          if (!isRest) {
            // Live routine summary for current week
            const liveSummary = buildWorkoutDaySummary(
              routine,
              rExercises,
              dateStr,
              bodyWeightKg
            );

            // If persistent store already had this day marked completed, keep it completed
            if (savedHistory[dateStr]?.completed && !liveSummary.completed) {
              liveSummary.completed = true;
            }

            map.set(dateStr, liveSummary);
            savedHistory[dateStr] = liveSummary;
            hasStoreUpdates = true;
          }
        } else {
          // Past or future week
          if (savedHistory[dateStr]) {
            map.set(dateStr, savedHistory[dateStr]);
          } else if (routine) {
            // Show planned routine for this day of the week
            const muscleGroups = parseMuscleGroups(routine.muscle_group);
            const isRest = muscleGroups.length === 1 && muscleGroups[0] === 'Rest';

            if (!isRest) {
              const rExercises = exercisesByRoutine.get(routine.id) ?? [];
              const templateSummary = buildWorkoutDaySummary(
                routine,
                rExercises,
                dateStr,
                bodyWeightKg,
                false // not completed by default if not recorded
              );
              map.set(dateStr, templateSummary);
            }
          }
        }

        iter.setDate(iter.getDate() + 1);
      }

      if (hasStoreUpdates) {
        saveHistoryStore(savedHistory).catch(console.warn);
      }

      setHistory(map);
    } catch (err) {
      console.error('Failed to load workout history:', err);
    }

    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  /**
   * Toggles completion status for any day in the calendar.
   * Immediately updates UI and persists to history storage and Supabase.
   */
  const toggleDayCompletion = useCallback(async (dateStr: string) => {
    const existing = history.get(dateStr);
    if (!existing) return;

    const nextCompleted = !existing.completed;
    const updatedSummary: WorkoutDaySummary = {
      ...existing,
      completed: nextCompleted,
      exercises: existing.exercises.map(ex => ({
        ...ex,
        completedSets: nextCompleted ? ex.sets : 0,
      })),
    };

    // 1. Optimistically update local calendar map
    setHistory(prev => {
      const nextMap = new Map(prev);
      nextMap.set(dateStr, updatedSummary);
      return nextMap;
    });

    // 2. Save to persistent history store
    await saveDayToHistory(updatedSummary);

    // 3. If target date is within the current active week, sync Supabase routines & exercises too
    const now = new Date();
    const currentMonday = getWeekMonday(now);
    const currentMondayStr = formatLocalDate(currentMonday);
    const currentSunday = new Date(currentMonday);
    currentSunday.setDate(currentMonday.getDate() + 6);
    const currentSundayStr = formatLocalDate(currentSunday);

    if (dateStr >= currentMondayStr && dateStr <= currentSundayStr) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayIndex = (dateObj.getDay() + 6) % 7; // Mon=0 ... Sun=6

      const { data: matchedRoutine } = await supabase
        .from('routines')
        .select('*')
        .eq('day_index', dayIndex)
        .maybeSingle();

      if (matchedRoutine) {
        await supabase
          .from('routines')
          .update({ completed: nextCompleted })
          .eq('id', matchedRoutine.id);

        const { data: routineExercises } = await supabase
          .from('exercises')
          .select('id, set_data')
          .eq('routine_id', matchedRoutine.id);

        if (routineExercises && routineExercises.length > 0) {
          await Promise.all(routineExercises.map((ex: any) => {
            const sets = Array.isArray(ex.set_data) ? ex.set_data : [];
            const newSets = sets.map((s: any) => ({ ...s, completed: nextCompleted }));
            return supabase.from('exercises').update({ set_data: newSets }).eq('id', ex.id);
          }));
        }
      }
    }
  }, [history]);

  return { history, loading, refetch: load, toggleDayCompletion };
}
