import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Routine, Exercise, MuscleGroup } from '../types';

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
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // --- Weekly Reset Logic (stored in Supabase so all devices share the same state) ---
    try {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay()); // Get most recent Sunday
      const currentSunday = d.toISOString().split('T')[0];

      // Read the last reset date from Supabase (shared across devices)
      const { data: configRow } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'last_reset_sunday')
        .maybeSingle();

      const lastReset = configRow?.value ?? '';

      if (lastReset !== currentSunday) {
        console.log('New week detected, resetting progress...');

        // Mark the new week FIRST so a concurrent device doesn't double-reset
        await supabase
          .from('app_config')
          .upsert({ key: 'last_reset_sunday', value: currentSunday });

        // Reset routines
        await supabase.from('routines').update({ completed: false }).gte('day_index', 0);

        // Reset all exercises' sets
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
      console.error('Failed to perform weekly reset:', err);
    }
    // --------------------------

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
    if (!data || data.length === 0) {
      const { data: seeded, error: seedErr } = await supabase
        .from('routines')
        .insert(SEED_DAYS)
        .select()
        .order('day_index');

      if (seedErr) setError(`Auto-seed failed: ${seedErr.message}`);
      else         setRoutines((seeded as Routine[]) ?? []);
    } else {
      setRoutines((data as Routine[]) ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRoutine = useCallback(async (id: string, patch: Partial<Routine>) => {
    const { error } = await supabase.from('routines').update(patch).eq('id', id);
    if (!error) setRoutines(p => p.map(r => r.id === id ? { ...r, ...patch } : r));
    return error;
  }, []);

  const toggleComplete = (r: Routine) =>
    updateRoutine(r.id, { completed: !r.completed });

  const setMuscleGroup = (r: Routine, muscle_group: MuscleGroup) =>
    updateRoutine(r.id, { muscle_group });

  const setNotes = (r: Routine, notes: string) =>
    updateRoutine(r.id, { notes });

  return { routines, loading, error, refetch: load, toggleComplete, setMuscleGroup, setNotes, updateRoutine };
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
    const { data, error } = await supabase
      .from('exercises')
      .insert({ ...ex, order_index: exercises.length })
      .select()
      .single();
    if (!error && data) setExercises(p => [...p, data as Exercise]);
    return error;
  };

  const remove = async (id: string) => {
    await supabase.from('exercises').delete().eq('id', id);
    setExercises(p => p.filter(e => e.id !== id));
  };

  const update = async (id: string, patch: Partial<Exercise>) => {
    await supabase.from('exercises').update(patch).eq('id', id);
    setExercises(p => p.map(e => e.id === id ? { ...e, ...patch } : e));
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

  return { exercises, loading, add, remove, update, reorder, saveOrder };
}
