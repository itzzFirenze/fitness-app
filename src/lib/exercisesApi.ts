export interface ApiExercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  gifUrl: string;
  instructions: string[];
}

// Maps our muscle groups → WorkoutX bodyPart / target values
// WorkoutX bodyPart values: back, chest, lower arms, lower legs, neck,
//   shoulders, upper arms, upper legs, waist, cardio
export const MUSCLE_MAP: Record<string, string[]> = {
  Back:      ['back'],
  Chest:     ['chest'],
  Biceps:    ['biceps'],
  Triceps:   ['triceps'],
  Shoulders: ['shoulders'],
  Arms:      ['upper arms', 'lower arms'],
  Legs:      ['upper legs', 'lower legs'],
  Core:      ['waist'],
  Cardio:    ['cardio'],
  Rest:      [],
};

const BASE = 'https://api.workoutxapp.com/v1';
const KEY  = import.meta.env.VITE_API_WORKOUTX as string;

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Unauthorized — check VITE_API_WORKOUTX in your .env file.',
  403: 'Forbidden — your WorkoutX API key may be invalid.',
  429: 'Rate limited — too many requests. Try again in a moment.',
};

async function wxFetch(path: string): Promise<ApiExercise[]> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-WorkoutX-Key': KEY || '' },
  });

  if (!res.ok) {
    throw new Error(
      STATUS_MESSAGES[res.status] ?? `WorkoutX error ${res.status}`
    );
  }

  const json = await res.json();
  // API may return { data: [...] } or a plain array
  return Array.isArray(json) ? json : (json.data ?? []);
}

export async function fetchExercises(params: {
  name?: string;
  muscle?: string; // a bodyPart string from MUSCLE_MAP
  limit?: number;
}): Promise<ApiExercise[]> {
  const limit = params.limit ?? 20;

  // Name search
  if (params.name) {
    const encoded = encodeURIComponent(params.name.toLowerCase());
    const q = new URLSearchParams({ limit: String(limit) });
    return wxFetch(`/exercises/name/${encoded}?${q}`);
  }

  // Filter by body part
  if (params.muscle) {
    const encoded = encodeURIComponent(params.muscle);
    const q = new URLSearchParams({ limit: String(limit) });
    return wxFetch(`/exercises/bodyPart/${encoded}?${q}`);
  }

  return [];
}
