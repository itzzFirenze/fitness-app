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

export const ALL_WORKOUT_GROUPS: MuscleGroup[] = [
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
