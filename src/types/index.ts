export type WorkoutMuscleGroup =
  | 'Back'
  | 'Chest'
  | 'Biceps'
  | 'Triceps'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Cardio';

export type MuscleGroup = WorkoutMuscleGroup | 'Rest';

export type ExerciseCategory = 'machine_weight' | 'reps_only' | 'cardio_time';

export interface SetEntry {
  id: string;
  reps: string;
  weight: string;
  completed: boolean;
  minutes?: string;
  calories?: string;
  category?: ExerciseCategory;
}

export const ALL_WORKOUT_GROUPS: WorkoutMuscleGroup[] = [
  'Chest',
  'Back',
  'Biceps',
  'Triceps',
  'Shoulders',
  'Arms',
  'Legs',
  'Core',
  'Cardio',
];

export const ALL_GROUPS: MuscleGroup[] = [...ALL_WORKOUT_GROUPS, 'Rest'];

export function parseMuscleGroups(raw?: string | null): MuscleGroup[] {
  if (!raw || raw.trim() === '' || raw.trim() === 'Rest') {
    return ['Rest'];
  }
  const parts = raw
    .split(',')
    .map(s => s.trim())
    .filter(s => ALL_GROUPS.includes(s as MuscleGroup)) as MuscleGroup[];

  const nonRest = parts.filter(g => g !== 'Rest');
  return nonRest.length > 0 ? nonRest : ['Rest'];
}

export function formatMuscleGroups(groups: MuscleGroup[]): string {
  const nonRest = groups.filter(g => g !== 'Rest');
  if (nonRest.length === 0) return 'Rest';
  return nonRest.join(', ');
}

export function isRestRoutine(raw?: string | null): boolean {
  if (!raw) return true;
  const groups = parseMuscleGroups(raw);
  return groups.length === 1 && groups[0] === 'Rest';
}

export function matchMuscleGroup(text?: string | null, fallbackGroups?: MuscleGroup[]): MuscleGroup {
  if (!text) {
    const validFallbacks = (fallbackGroups ?? []).filter(g => g !== 'Rest');
    if (validFallbacks.length > 0) return validFallbacks[0];
    return 'Chest';
  }
  const str = text.toLowerCase();

  if (str.includes('bicep')) return 'Biceps';
  if (str.includes('tricep')) return 'Triceps';
  if (str.includes('chest') || str.includes('pectoral') || str.includes('bench') || str.includes('pushup') || str.includes('push-up') || str.includes('fly')) return 'Chest';
  if (str.includes('back') || str.includes('lat') || str.includes('pullup') || str.includes('pull-up') || str.includes('pulldown') || str.includes('row') || str.includes('deadlift') || str.includes('trap')) return 'Back';
  if (str.includes('shoulder') || str.includes('delt') || str.includes('overhead') || str.includes('military') || str.includes('lateral raise')) return 'Shoulders';
  if (str.includes('leg') || str.includes('squat') || str.includes('quad') || str.includes('hamstring') || str.includes('lunge') || str.includes('calf') || str.includes('glute')) return 'Legs';
  if (str.includes('arm') || str.includes('forearm') || str.includes('wrist')) return 'Arms';
  if (str.includes('core') || str.includes('abs') || str.includes('waist') || str.includes('crunch') || str.includes('plank') || str.includes('oblique')) return 'Core';
  if (str.includes('cardio') || str.includes('run') || str.includes('bike') || str.includes('treadmill') || str.includes('cycle') || str.includes('rowing') || str.includes('jump')) return 'Cardio';

  for (const g of ALL_WORKOUT_GROUPS) {
    if (str.includes(g.toLowerCase())) return g;
  }

  const validFallbacks = (fallbackGroups ?? []).filter(g => g !== 'Rest');
  if (validFallbacks.length > 0) return validFallbacks[0];
  return 'Chest';
}

export function getExerciseMuscleGroup(
  exercise: { exercise_type?: string; name?: string },
  routineMuscleGroup?: string | null
): string {
  const routineGroups = parseMuscleGroups(routineMuscleGroup).filter(g => g !== 'Rest');

  if (exercise.exercise_type) {
    const trimmed = exercise.exercise_type.trim();
    const matched = ALL_WORKOUT_GROUPS.find(
      g => g.toLowerCase() === trimmed.toLowerCase()
    );
    if (matched) return matched;
  }

  const combined = `${exercise.exercise_type || ''} ${exercise.name || ''}`;
  return matchMuscleGroup(combined, routineGroups);
}

export interface Routine {
  id: string;
  day: string;
  day_index: number;
  muscle_group: string;
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
  category?: ExerciseCategory;
}

export function getExerciseCategory(
  exercise: { name?: string; exercise_type?: string; set_data?: SetEntry[]; category?: ExerciseCategory }
): ExerciseCategory {
  // 1. Explicitly set category
  if (exercise.category) return exercise.category;
  if (exercise.set_data?.[0]?.category) return exercise.set_data[0].category;

  // 2. Check if minutes or calories exist in set_data
  if (exercise.set_data?.some(s => (s.minutes !== undefined && s.minutes !== '') || (s.calories !== undefined && s.calories !== ''))) {
    return 'cardio_time';
  }

  const name = (exercise.name || '').toLowerCase();
  const type = (exercise.exercise_type || '').toLowerCase();

  // 3. Cardio keywords (Treadmill, Bike, etc.)
  if (
    name.includes('treadmill') ||
    name.includes('running') ||
    name.includes('run') ||
    name.includes('jog') ||
    name.includes('bike') ||
    name.includes('cycle') ||
    name.includes('cycling') ||
    name.includes('elliptical') ||
    name.includes('stairmaster') ||
    name.includes('stair climber') ||
    name.includes('rower') ||
    name.includes('rowing') ||
    name.includes('walk') ||
    name.includes('walking') ||
    name.includes('jump rope') ||
    name.includes('skipping') ||
    type === 'cardio'
  ) {
    return 'cardio_time';
  }

  // 4. Reps-only bodyweight keywords (Bench Dip, Pushups, Pull-ups, Abs, etc.)
  if (
    name.includes('bench dip') ||
    name.includes('dip') ||
    name.includes('pushup') ||
    name.includes('push-up') ||
    name.includes('push up') ||
    name.includes('pullup') ||
    name.includes('pull-up') ||
    name.includes('pull up') ||
    name.includes('chinup') ||
    name.includes('chin-up') ||
    name.includes('chin up') ||
    name.includes('crunch') ||
    name.includes('situp') ||
    name.includes('sit-up') ||
    name.includes('sit up') ||
    name.includes('plank') ||
    name.includes('leg raise') ||
    name.includes('knee raise') ||
    name.includes('flutter') ||
    name.includes('russian twist') ||
    name.includes('twist') ||
    name.includes('burpee') ||
    name.includes('jumping jack') ||
    name.includes('bodyweight') ||
    name.includes('abs') ||
    name.includes('ab ') ||
    name.startsWith('ab ') ||
    name === 'ab' ||
    name === 'abs' ||
    name.includes('core') ||
    type.includes('waist') ||
    type.includes('abs')
  ) {
    return 'reps_only';
  }

  // 5. Default is Machine / Weighted exercises (kg & reps)
  return 'machine_weight';
}

export function makeDefaultSets(
  count: number,
  reps: string = '10',
  weight: string = '',
  category: ExerciseCategory = 'machine_weight',
  minutes: string = '20',
  calories: string = '150',
): SetEntry[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    reps: category === 'cardio_time' ? '' : reps,
    weight: category === 'reps_only' || category === 'cardio_time' ? '' : weight,
    minutes: category === 'cardio_time' ? minutes : undefined,
    calories: category === 'cardio_time' ? calories : undefined,
    category,
    completed: false,
  }));
}

