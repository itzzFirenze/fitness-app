export type MuscleGroup =
  | 'Back'
  | 'Chest'
  | 'Biceps'
  | 'Triceps'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Cardio'
  | 'Rest';

export interface SetEntry {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
}

export interface Routine {
  id: string;
  day: string;
  day_index: number;
  muscle_group: MuscleGroup;
  notes: string;
  completed: boolean;
}

export interface Exercise {
  id: string;
  routine_id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  order_index: number;
  set_data: SetEntry[];
  exercise_type: string;
  image_url: string;
}

export function makeDefaultSets(
  count: number,
  reps: string,
  weight: string,
): SetEntry[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    reps,
    weight,
    completed: false,
  }));
}
