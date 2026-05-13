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

  return { routines, loading, error, refetch: load, toggleComplete, setMuscleGroup, setNotes };
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

  return { exercises, loading, add, remove, update };
}
