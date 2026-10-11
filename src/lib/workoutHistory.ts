import { supabase } from './supabase';
import type { Routine, Exercise, MuscleGroup, ExerciseCategory } from '../types';
import { parseMuscleGroups, getExerciseMuscleGroup, getExerciseCategory } from '../types';

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

export function getUserBodyWeightKg(): number {
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
  return 70; // standard default 70 kg
}

export const MINUTES_PER_SET = 2.75;

/** Format a date into YYYY-MM-DD using local time (avoids UTC offset day shifts) */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Get the Monday corresponding to the week of date `d` */
export function getWeekMonday(d: Date = new Date()): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const STORAGE_KEY = 'apex_workout_history';
const CONFIG_KEY = 'workout_history';

export function getLocalHistoryStore(): Record<string, WorkoutDaySummary> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse local workout history store:', err);
  }
  return {};
}

export async function loadHistoryStore(): Promise<Record<string, WorkoutDaySummary>> {
  const local = getLocalHistoryStore();

  try {
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', CONFIG_KEY)
      .maybeSingle();

    if (configRow?.value) {
      const remote = JSON.parse(configRow.value);
      const merged: Record<string, WorkoutDaySummary> = { ...remote };
      for (const [dateStr, localSummary] of Object.entries(local)) {
        if (!merged[dateStr]) {
          merged[dateStr] = localSummary;
        } else {
          // If local has completed true, preserve completion
          if (localSummary.completed && !merged[dateStr].completed) {
            merged[dateStr] = localSummary;
          } else if (localSummary.totalSets > merged[dateStr].totalSets) {
            merged[dateStr] = localSummary;
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Failed to load remote workout history from Supabase:', err);
  }

  return local;
}

export async function saveHistoryStore(store: Record<string, WorkoutDaySummary>): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Failed to save workout history to localStorage:', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('app_config')
        .upsert({
          user_id: user.id,
          key: CONFIG_KEY,
          value: JSON.stringify(store),
        });
    }
  } catch (err) {
    console.warn('Failed to sync workout history to Supabase app_config:', err);
  }
}

export async function saveDayToHistory(summary: WorkoutDaySummary): Promise<void> {
  const store = getLocalHistoryStore();
  store[summary.date] = summary;
  await saveHistoryStore(store);
}

export function buildWorkoutDaySummary(
  routine: Routine,
  routineExercises: Exercise[],
  dateStr: string,
  bodyWeightKg: number = getUserBodyWeightKg(),
  completedOverride?: boolean
): WorkoutDaySummary {
  const muscleGroups = parseMuscleGroups(routine.muscle_group);
  const isCompleted = completedOverride !== undefined ? completedOverride : Boolean(routine.completed);

  const exerciseSummaries: WorkoutExerciseSummary[] = routineExercises.map(ex => {
    const setData = Array.isArray(ex.set_data) ? ex.set_data : [];
    const category = getExerciseCategory(ex);
    const completedSets = isCompleted
      ? setData.length
      : setData.filter((s: any) => s.completed).length;

    // Strength / Reps
    const totalReps = setData
      .filter((s: any) => isCompleted || s.completed)
      .reduce((sum: number, s: any) => sum + (parseInt(s.reps) || 0), 0);

    const totalWeight = setData
      .filter((s: any) => isCompleted || s.completed)
      .reduce((sum: number, s: any) => {
        const reps = parseInt(s.reps) || 0;
        const weight = parseFloat(s.weight) || 0;
        return sum + reps * weight;
      }, 0);

    // Cardio / Time
    const activeSetList = isCompleted
      ? setData
      : (completedSets > 0
          ? setData.filter((s: any) => s.completed)
          : setData.filter((s: any) => (parseFloat(s.calories) > 0) || (parseFloat(s.minutes) > 0)));

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
      const effectiveMinutes = totalMinutes > 0 ? totalMinutes : (isCompleted ? plannedMinutes : 0);
      if (enteredCalories > 0) {
        exerciseCalories = Math.round(enteredCalories);
      } else if (effectiveMinutes > 0) {
        const durationHours = effectiveMinutes / 60;
        exerciseCalories = Math.round(exerciseMET * bodyWeightKg * durationHours);
      }
    } else {
      const activeSets = completedSets > 0 ? completedSets : (isCompleted ? setData.length : 0);
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

  const cardioMinutes = exerciseSummaries
    .filter(e => e.category === 'cardio_time')
    .reduce((sum, e) => sum + (e.totalMinutes > 0 ? e.totalMinutes : (isCompleted ? e.sets * 20 : 0)), 0);

  const strengthCompletedSets = exerciseSummaries
    .filter(e => e.category !== 'cardio_time')
    .reduce((sum, e) => sum + e.completedSets, 0);

  const strengthPlannedSets = exerciseSummaries
    .filter(e => e.category !== 'cardio_time')
    .reduce((sum, e) => sum + e.sets, 0);

  const activeStrengthSets = strengthCompletedSets > 0
    ? strengthCompletedSets
    : (isCompleted ? strengthPlannedSets : 0);

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
    : (isCompleted ? Math.round(dayMET * bodyWeightKg * dayDurationHours) : 0);

  return {
    date: dateStr,
    day: routine.day,
    muscleGroups,
    completed: isCompleted,
    exercises: exerciseSummaries,
    totalExercises: routineExercises.length,
    totalSets,
    totalVolume,
    estimatedCalories,
    durationEstimate,
  };
}
