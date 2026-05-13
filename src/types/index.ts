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

// Matches Supabase `routines` table columns
export interface Routine {
  id: string;
  day: string;          // 'Monday' … 'Sunday'
  day_index: number;    // 0 = Monday, 6 = Sunday
  muscle_group: MuscleGroup;
  notes: string;
  completed: boolean;
}

// Matches Supabase `exercises` table columns
export interface Exercise {
  id: string;
  routine_id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  order_index: number;
}
