import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Routine, Exercise, MuscleGroup } from '../types';
import { formatMuscleGroups, isRestRoutine } from '../types';
import {
  getWeekMonday,
  formatLocalDate,
  loadHistoryStore,
  saveHistoryStore,
  saveDayToHistory,
  buildWorkoutDaySummary,
} from '../lib/workoutHistory';

export interface RoutineProgressInfo {
  totalSets: number;
  completedSets: number;
  progress: number;
}

const SEED_DAYS = [
  { day: 'Monday',    day_index: 0, muscle_group: 'Rest' as MuscleGroup, notes: '', completed: false },
  { day: 'Tuesday',   day_index: 1, muscle_group: 'Rest' as MuscleGroup, notes: '', completed: false },
  { day: 'Wednesday', day_index: 2, muscle_group: 'Rest' as MuscleGroup, notes: '', completed: false },
  { day: 'Thursday',  day_index: 3, muscle_group: 'Rest' as MuscleGroup, notes: '', completed: false },
  { day: 'Friday',    day_index: 4, muscle_group: 'Rest' as MuscleGroup, notes: '', completed: false },
  { day: 'Saturday',  day_index: 5, muscle_group: 'Rest' as MuscleGroup, notes: '', completed: false },
  { day: 'Sunday',    day_index: 6, muscle_group: 'Rest' as MuscleGroup, notes: '', completed: false },
];

/* ── Weekly routines ─────────────────────────────────────── */
export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineProgress, setRoutineProgress] = useState<Record<string, RoutineProgressInfo>>({});
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // --- Weekly Reset Logic (Stored in Supabase, week runs Monday to Sunday) ---
    try {
      // The week begins on MONDAY (day_index 0) and ends on SUNDAY (day_index 6).
      // Sunday is day 7 of the workout week. Weekly reset MUST trigger on Monday, not Sunday!
      const currentMonday = getWeekMonday(new Date());
      const currentMondayStr = formatLocalDate(currentMonday);

      // Read the last reset date from Supabase
      const { data: configRow } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'last_reset_monday')
        .maybeSingle();

      const lastReset = configRow?.value ?? '';

      if (!lastReset) {
        // First run with new reset tracking: initialize without wiping active week
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('app_config')
            .upsert({ user_id: user.id, key: 'last_reset_monday', value: currentMondayStr });
        }
      } else if (lastReset !== currentMondayStr) {
        console.log('New week detected on Monday, archiving previous week and resetting progress...');

        // 1. Snapshot the completed week into persistent history before wiping
        try {
          const { data: prevRoutines } = await supabase.from('routines').select('*').order('day_index');
          const { data: prevExercises } = await supabase.from('exercises').select('*').order('order_index');

          if (prevRoutines && prevExercises) {
            const exByRoutine = new Map<string, Exercise[]>();
            for (const ex of (prevExercises as Exercise[])) {
              const list = exByRoutine.get(ex.routine_id) ?? [];
              list.push(ex);
              exByRoutine.set(ex.routine_id, list);
            }

            // The ending week's Monday was lastReset
            const [ly, lm, ld] = lastReset.split('-').map(Number);
            const endingMonday = new Date(ly, lm - 1, ld);
            const historyStore = await loadHistoryStore();

            for (const r of (prevRoutines as Routine[])) {
              const dayDate = new Date(endingMonday);
              dayDate.setDate(endingMonday.getDate() + r.day_index);
              const dayDateStr = formatLocalDate(dayDate);
              const rEx = exByRoutine.get(r.id) ?? [];

              // If it had activity or was marked complete, archive it
              historyStore[dayDateStr] = buildWorkoutDaySummary(r, rEx, dayDateStr);
            }

            await saveHistoryStore(historyStore);
          }
        } catch (archiveErr) {
          console.warn('Failed to archive ending week history:', archiveErr);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('app_config')
            .upsert({ user_id: user.id, key: 'last_reset_monday', value: currentMondayStr });
        }

        // Reset routines completion
        await supabase.from('routines').update({ completed: false }).gte('day_index', 0);

        // Reset all exercises' sets completion
        const { data: exercises } = await supabase.from('exercises').select('id, set_data');
        if (exercises) {
          await Promise.all(exercises.map((ex: any) => {
            if (Array.isArray(ex.set_data) && ex.set_data.length > 0) {
              const newSetData = ex.set_data.map((s: any) => ({ ...s, completed: false }));
              return supabase.from('exercises').update({ set_data: newSetData }).eq('id', ex.id);
            }
            return Promise.resolve();
          }));
        }
      }
    } catch (err) {
      console.error('Failed to perform weekly reset check:', err);
    }
    // --------------------------------------------------------------------------

    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .order('day_index');

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Auto-seed the 7 days on first run if the table is empty
    let loadedRoutines: Routine[] = [];
    if (!data || data.length === 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const seedWithUser = SEED_DAYS.map(d => ({ ...d, user_id: user.id }));
        const { data: seeded, error: seedErr } = await supabase
          .from('routines')
          .upsert(seedWithUser, { onConflict: 'user_id,day', ignoreDuplicates: true })
          .select()
          .order('day_index');

        if (seedErr) setError(`Auto-seed failed: ${seedErr.message}`);
        else {
          if (!seeded || seeded.length === 0) {
            const { data: refetched } = await supabase.from('routines').select('*').order('day_index');
            loadedRoutines = (refetched as Routine[]) ?? [];
          } else {
            loadedRoutines = (seeded as Routine[]) ?? [];
          }
        }
      }
    } else {
      loadedRoutines = (data as Routine[]) ?? [];
    }
    setRoutines(loadedRoutines);

    // Compute progress for each routine based on exercises and set completion
    try {
      const { data: exercisesData } = await supabase
        .from('exercises')
        .select('id, routine_id, sets, set_data')
        .order('order_index');

      const progressMap: Record<string, RoutineProgressInfo> = {};
      const exByRoutine = new Map<string, any[]>();
      for (const ex of (exercisesData ?? [])) {
        const list = exByRoutine.get(ex.routine_id) ?? [];
        list.push(ex);
        exByRoutine.set(ex.routine_id, list);
      }

      for (const r of loadedRoutines) {
        if (isRestRoutine(r.muscle_group)) {
          progressMap[r.id] = { totalSets: 0, completedSets: 0, progress: 1 };
          continue;
        }
        if (r.completed) {
          progressMap[r.id] = { totalSets: 0, completedSets: 0, progress: 1 };
          continue;
        }

        const exList = exByRoutine.get(r.id) ?? [];
        let totalSets = 0;
        let completedSets = 0;
        for (const ex of exList) {
          const setData = Array.isArray(ex.set_data) && ex.set_data.length > 0
            ? ex.set_data
            : (ex.sets ? Array.from({ length: ex.sets }, () => ({ completed: false })) : []);
          totalSets += setData.length;
          completedSets += setData.filter((s: any) => s && s.completed).length;
        }
        const progress = totalSets > 0 ? completedSets / totalSets : 0;
        progressMap[r.id] = { totalSets, completedSets, progress };
      }
      setRoutineProgress(progressMap);
    } catch (exErr) {
      console.warn('Failed to compute routine progress:', exErr);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const handleFocus = () => { load(); };
    window.addEventListener('focus', handleFocus);
    return () => { window.removeEventListener('focus', handleFocus); };
  }, [load]);

  const updateRoutine = useCallback(async (id: string, patch: Partial<Routine>) => {
    const { error } = await supabase.from('routines').update(patch).eq('id', id);
    if (!error) {
      setRoutines(p => p.map(r => r.id === id ? { ...r, ...patch } : r));
      if (patch.completed !== undefined) {
        setRoutineProgress(prev => ({
          ...prev,
          [id]: {
            totalSets: prev[id]?.totalSets ?? 0,
            completedSets: patch.completed ? (prev[id]?.totalSets ?? 1) : 0,
            progress: patch.completed ? 1 : 0,
          }
        }));
      }
    }
    return error;
  }, []);

  const toggleComplete = useCallback(async (r: Routine) => {
    const nextCompleted = !r.completed;
    // 1. Optimistic update
    setRoutines(prev => prev.map(item => item.id === r.id ? { ...item, completed: nextCompleted } : item));
    setRoutineProgress(prev => ({
      ...prev,
      [r.id]: {
        totalSets: prev[r.id]?.totalSets ?? 0,
        completedSets: nextCompleted ? (prev[r.id]?.totalSets ?? 1) : 0,
        progress: nextCompleted ? 1 : 0,
      }
    }));

    // 2. Persist routine
    await supabase.from('routines').update({ completed: nextCompleted }).eq('id', r.id);

    // 3. Update all exercises in this routine
    const { data: exList } = await supabase
      .from('exercises')
      .select('*')
      .eq('routine_id', r.id)
      .order('order_index');

    if (exList && exList.length > 0) {
      const updatedExercises = exList.map(ex => {
        const sets = Array.isArray(ex.set_data) ? ex.set_data : [];
        const newSets = sets.map((s: any) => ({ ...s, completed: nextCompleted }));
        return { ...ex, set_data: newSets };
      });
      await Promise.all(updatedExercises.map(ex =>
        supabase.from('exercises').update({ set_data: ex.set_data }).eq('id', ex.id)
      ));

      // 4. Save to persistent history store
      const monday = getWeekMonday(new Date());
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + r.day_index);
      const targetDateStr = formatLocalDate(targetDate);

      const summary = buildWorkoutDaySummary(
        { ...r, completed: nextCompleted },
        updatedExercises as Exercise[],
        targetDateStr,
        undefined,
        nextCompleted
      );
      await saveDayToHistory(summary);
    } else {
      // Routine without exercises: still record day summary
      const monday = getWeekMonday(new Date());
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + r.day_index);
      const targetDateStr = formatLocalDate(targetDate);

      const summary = buildWorkoutDaySummary(
        { ...r, completed: nextCompleted },
        [],
        targetDateStr,
        undefined,
        nextCompleted
      );
      await saveDayToHistory(summary);
    }
  }, []);

  const setMuscleGroup = (r: Routine, muscle_group: string) =>
    updateRoutine(r.id, { muscle_group });

  const setMuscleGroups = (r: Routine, groups: MuscleGroup[]) =>
    updateRoutine(r.id, { muscle_group: formatMuscleGroups(groups) });

  const setNotes = (r: Routine, notes: string) =>
    updateRoutine(r.id, { notes });

  return { routines, routineProgress, loading, error, refetch: load, toggleComplete, setMuscleGroup, setMuscleGroups, setNotes, updateRoutine };
}

/* ── Exercises for one routine ───────────────────────────── */
export function useExercises(routineId: string | undefined) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading,   setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!routineId) return;
    setLoading(true);
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('routine_id', routineId)
      .order('order_index');
    setExercises((data as Exercise[]) ?? []);
    setLoading(false);
  }, [routineId]);

  useEffect(() => { load(); }, [load]);

  const add = async (ex: Omit<Exercise, 'id' | 'order_index'>) => {
    const { category, ...cleanEx } = ex as any;
    const dbPayload = {
      routine_id: cleanEx.routine_id,
      name: cleanEx.name,
      sets: cleanEx.sets || 3,
      reps: cleanEx.reps ?? '',
      weight: cleanEx.weight ?? '',
      order_index: exercises.length,
      set_data: cleanEx.set_data || [],
      exercise_type: cleanEx.exercise_type || '',
      image_url: cleanEx.image_url || '',
    };
    const { data, error } = await supabase
      .from('exercises')
      .insert(dbPayload)
      .select()
      .single();
    if (error) {
      console.error('Failed to add exercise to Supabase:', error);
      return error;
    }
    if (data) setExercises(p => [...p, data as Exercise]);
    return null;
  };

  const remove = async (id: string) => {
    await supabase.from('exercises').delete().eq('id', id);
    setExercises(p => p.filter(e => e.id !== id));
  };

  const update = async (id: string, patch: Partial<Exercise>) => {
    // Optimistically update local state first so UI reflects changes immediately
    setExercises(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
    const { category, ...cleanPatch } = patch as any;
    if (Object.keys(cleanPatch).length > 0) {
      const { error } = await supabase.from('exercises').update(cleanPatch).eq('id', id);
      if (error) {
        console.error('Failed to update exercise in Supabase:', error);
      }
    }
  };

  const reorder = async (index: number, direction: 'up' | 'down') => {
    // Legacy up/down reorder... (keep for fallback)
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === exercises.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const newEx = [...exercises];
    
    // Swap items
    const temp = newEx[index];
    newEx[index] = newEx[swapIndex];
    newEx[swapIndex] = temp;
    
    // Reassign order_index for safety
    newEx.forEach((ex, i) => { ex.order_index = i; });
    
    setExercises(newEx);
    
    // Update DB
    await Promise.all([
      supabase.from('exercises').update({ order_index: newEx[index].order_index }).eq('id', newEx[index].id),
      supabase.from('exercises').update({ order_index: newEx[swapIndex].order_index }).eq('id', newEx[swapIndex].id)
    ]);
  };

  const saveOrder = async (reorderedExercises: Exercise[]) => {
    // Update local state first
    const updated = reorderedExercises.map((ex, i) => ({ ...ex, order_index: i }));
    setExercises(updated);
    
    // Batch update DB
    await Promise.all(
      updated.map(ex => supabase.from('exercises').update({ order_index: ex.order_index }).eq('id', ex.id))
    );
  };

  return { exercises, loading, add, remove, update, reorder, saveOrder, refetch: load };
}
