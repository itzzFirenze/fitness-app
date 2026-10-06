import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { MuscleGroup, ExerciseCategory } from '../types';
import { parseMuscleGroups, getExerciseMuscleGroup, getExerciseCategory } from '../types';

export const WORKOUT_CATEGORY_MET: Record<string, number> = {
  legs: 6.0,
  back: 5.5,
  chest: 5.0,
  shoulders: 4.5,
  arms: 4.0,
  abs: 3.8,
  core: 3.8,
  cardio: 7.0,
};

export function getWorkoutCategoryMET(categoryOrGroup: string): number {
  const str = (categoryOrGroup || '').toLowerCase();
  if (str.includes('leg') || str.includes('squat') || str.includes('quad') || str.includes('hamstring') || str.includes('calf') || str.includes('glute') || str.includes('lunge')) {
    return WORKOUT_CATEGORY_MET.legs;
  }
  if (str.includes('back') || str.includes('lat') || str.includes('row') || str.includes('pull') || str.includes('deadlift') || str.includes('trap')) {
    return WORKOUT_CATEGORY_MET.back;
  }
  if (str.includes('chest') || str.includes('bench') || str.includes('push') || str.includes('pec') || str.includes('dip') || str.includes('fly')) {
    return WORKOUT_CATEGORY_MET.chest;
  }
  if (str.includes('shoulder') || str.includes('delt') || str.includes('military') || str.includes('overhead') || str.includes('raise')) {
    return WORKOUT_CATEGORY_MET.shoulders;
  }
  if (str.includes('arm') || str.includes('bicep') || str.includes('tricep') || str.includes('curl') || str.includes('forearm')) {
    return WORKOUT_CATEGORY_MET.arms;
  }
  if (str.includes('abs') || str.includes('core') || str.includes('waist') || str.includes('crunch') || str.includes('plank')) {
    return WORKOUT_CATEGORY_MET.abs;
  }
  if (str.includes('cardio') || str.includes('run') || str.includes('cycle') || str.includes('hiit') || str.includes('bike') || str.includes('treadmill')) {
    return WORKOUT_CATEGORY_MET.cardio;
  }
  return 5.0; // default moderate resistance training
}

function getUserBodyWeightKg(): number {
  try {
    const cached = localStorage.getItem('apex_body_metrics');
    if (cached) {
      const data = JSON.parse(cached);
      if (data.weight && data.weight > 0) {
        return data.weightUnit === 'lbs' ? data.weight * 0.45359237 : Number(data.weight);
      }
    }
  } catch {
    // fallback
  }
  return 70; // standard default 70 kg (~154 lbs) if not entered yet
}

// Average ~2.5 to 3 minutes per set including rest interval
const MINUTES_PER_SET = 2.75;

export interface WorkoutExerciseSummary {
  name: string;
  sets: number;
  completedSets: number;
  totalReps: number;
  totalWeight: number;
  totalMinutes: number;
  enteredCalories: number;
  estimatedCalories: number;
  exerciseType: string;
  category: ExerciseCategory;
}

export interface WorkoutDaySummary {
  date: string; // YYYY-MM-DD
  day: string; // Monday, Tuesday, etc.
  muscleGroups: MuscleGroup[];
  completed: boolean;
  exercises: WorkoutExerciseSummary[];
  totalExercises: number;
  totalSets: number;
  totalVolume: number; // total weight × reps
  estimatedCalories: number; // approximate calories burned (kcal)
  durationEstimate: number; // rough estimate in minutes
}

/**
 * Fetches workout history for a given month/year.
 * Since there's no dedicated history table, this uses the current week's
 * routines+exercises to populate the current week and returns empty for past dates.
 * 
 * For a full history system, you'd create a `workout_logs` table. For now,
 * we pull the current week's routine data live.
 */
export function useWorkoutHistory(year: number, month: number) {
  const [history, setHistory] = useState<Map<string, WorkoutDaySummary>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      // Fetch all routines
      const { data: routines, error: rErr } = await supabase
        .from('routines')
        .select('*')
        .order('day_index');

      if (rErr || !routines) {
        setLoading(false);
        return;
      }

      // Fetch all exercises
      const { data: exercises, error: exErr } = await supabase
        .from('exercises')
        .select('*')
        .order('order_index');

      if (exErr) {
        setLoading(false);
        return;
      }

      // Build a map: routine_id -> exercises
      const exercisesByRoutine = new Map<string, typeof exercises>();
      for (const ex of (exercises ?? [])) {
        const list = exercisesByRoutine.get(ex.routine_id) ?? [];
        list.push(ex);
        exercisesByRoutine.set(ex.routine_id, list);
      }

      // Build a map: day_index -> routine data
      const routineByDayIndex = new Map<number, (typeof routines)[0]>();
      for (const r of routines) {
        routineByDayIndex.set(r.day_index, r);
      }

      // Get the current week's Monday
      const now = new Date();
      const currentDay = now.getDay(); // 0=Sun
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const currentMonday = new Date(now);
      currentMonday.setDate(now.getDate() + mondayOffset);
      currentMonday.setHours(0, 0, 0, 0);

      const map = new Map<string, WorkoutDaySummary>();

      const bodyWeightKg = getUserBodyWeightKg();

      // Populate current week's data
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentMonday);
        date.setDate(currentMonday.getDate() + i);
        const dateStr = formatDate(date);

        // Only include dates in the requested month
        if (date.getFullYear() !== year || date.getMonth() !== month) continue;

        const routine = routineByDayIndex.get(i);
        if (!routine) continue;

        const muscleGroups = parseMuscleGroups(routine.muscle_group);
        const isRest = muscleGroups.length === 1 && muscleGroups[0] === 'Rest';

        if (isRest) continue;

        const routineExercises = exercisesByRoutine.get(routine.id) ?? [];

        const exerciseSummaries: WorkoutExerciseSummary[] = routineExercises.map(ex => {
          const setData = Array.isArray(ex.set_data) ? ex.set_data : [];
          const category = getExerciseCategory(ex);
          const completedSets = setData.filter((s: any) => s.completed).length;

          // For strength / bodyweight
          const totalReps = setData
            .filter((s: any) => s.completed)
            .reduce((sum: number, s: any) => sum + (parseInt(s.reps) || 0), 0);
          const totalWeight = setData
            .filter((s: any) => s.completed)
            .reduce((sum: number, s: any) => {
              const reps = parseInt(s.reps) || 0;
              const weight = parseFloat(s.weight) || 0;
              return sum + reps * weight;
            }, 0);

          // For cardio / time-based
          const activeSetList = completedSets > 0
            ? setData.filter((s: any) => s.completed)
            : (routine.completed ? setData : setData.filter((s: any) => (parseFloat(s.calories) > 0) || (parseFloat(s.minutes) > 0)));

          const enteredCalories = activeSetList
            .reduce((sum: number, s: any) => sum + (parseFloat(s.calories) || 0), 0);

          const totalMinutes = activeSetList
            .reduce((sum: number, s: any) => sum + (parseFloat(s.minutes) || 0), 0);

          const plannedMinutes = setData
            .reduce((sum: number, s: any) => sum + (parseFloat(s.minutes) || 0), 0);

          const resolvedCategory = getExerciseMuscleGroup(ex, routine.muscle_group);
          const exerciseMET = getWorkoutCategoryMET(resolvedCategory);

          let exerciseCalories = 0;
          if (category === 'cardio_time') {
            const effectiveMinutes = totalMinutes > 0 ? totalMinutes : (routine.completed ? plannedMinutes : 0);
            if (enteredCalories > 0) {
              // Exact user-entered calories burned!
              exerciseCalories = Math.round(enteredCalories);
            } else if (effectiveMinutes > 0) {
              // Estimated calories from minutes spent & MET
              const durationHours = effectiveMinutes / 60;
              exerciseCalories = Math.round(exerciseMET * bodyWeightKg * durationHours);
            }
          } else {
            // Machine weight or Reps only
            const activeSets = completedSets > 0 ? completedSets : (routine.completed ? setData.length : 0);
            const exerciseDurationHours = (activeSets * MINUTES_PER_SET) / 60;
            exerciseCalories = Math.round(exerciseMET * bodyWeightKg * exerciseDurationHours);
          }

          return {
            name: ex.name,
            sets: setData.length,
            completedSets,
            totalReps,
            totalWeight,
            totalMinutes,
            enteredCalories,
            estimatedCalories: exerciseCalories,
            exerciseType: ex.exercise_type || '',
            category,
          };
        });

        const totalSets = exerciseSummaries.reduce((s, e) => s + e.completedSets, 0);
        const totalVolume = exerciseSummaries.reduce((s, e) => s + e.totalWeight, 0);

        // Duration estimation: cardio minutes + strength sets * MINUTES_PER_SET
        const cardioMinutes = exerciseSummaries
          .filter(e => e.category === 'cardio_time')
          .reduce((sum, e) => sum + (e.totalMinutes > 0 ? e.totalMinutes : (routine.completed ? e.sets * 20 : 0)), 0);

        const strengthCompletedSets = exerciseSummaries
          .filter(e => e.category !== 'cardio_time')
          .reduce((sum, e) => sum + e.completedSets, 0);

        const strengthPlannedSets = exerciseSummaries
          .filter(e => e.category !== 'cardio_time')
          .reduce((sum, e) => sum + e.sets, 0);

        const activeStrengthSets = strengthCompletedSets > 0 ? strengthCompletedSets : (routine.completed ? strengthPlannedSets : 0);
        const strengthMinutes = activeStrengthSets * MINUTES_PER_SET;

        const durationEstimate = Math.round(
          (cardioMinutes + strengthMinutes) > 0
            ? (cardioMinutes + strengthMinutes)
            : Math.max(routineExercises.length * 8, 20)
        );
        const dayDurationHours = durationEstimate / 60;

        const sumCalories = exerciseSummaries.reduce((s, e) => s + e.estimatedCalories, 0);
        const dayMET = getWorkoutCategoryMET(routine.muscle_group);
        const estimatedCalories = sumCalories > 0
          ? sumCalories
          : (routine.completed ? Math.round(dayMET * bodyWeightKg * dayDurationHours) : 0);

        // Show all non-rest workout days (already filtered isRest above)
        map.set(dateStr, {
          date: dateStr,
          day: routine.day,
          muscleGroups,
          completed: routine.completed,
          exercises: exerciseSummaries,
          totalExercises: routineExercises.length,
          totalSets,
          totalVolume,
          estimatedCalories,
          durationEstimate,
        });
      }

      setHistory(map);
    } catch (err) {
      console.error('Failed to load workout history:', err);
    }

    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  return { history, loading, refetch: load };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
