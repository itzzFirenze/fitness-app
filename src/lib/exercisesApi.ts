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

// Gather all available keys from environment
const KEYS = [
  import.meta.env.VITE_API_WORKOUTX,
  import.meta.env.VITE_API_WORKOUTX_BACKUP1,
  import.meta.env.VITE_API_WORKOUTX_BACKUP2
].filter(Boolean) as string[];

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Unauthorized — API key is invalid or expired.',
  403: 'Forbidden — API key may be restricted or usage limit hit.',
  429: 'Rate limited — all API keys have hit their usage limits.',
};

async function wxFetch(path: string): Promise<ApiExercise[]> {
  if (KEYS.length === 0) {
    throw new Error('No WorkoutX API keys configured in .env');
  }

  let lastRes: Response | null = null;

  // Try each key in sequence
  for (const key of KEYS) {
    // If it's a dummy placeholder, skip it
    if (key.includes('placeholder')) continue;

    const res = await fetch(`${BASE}${path}`, {
      headers: { 'X-WorkoutX-Key': key },
    });

    // If successful, break and return data
    if (res.ok) {
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    }

    lastRes = res;
    // If rate limited or unauthorized, try the next key
    if (res.status === 429 || res.status === 403 || res.status === 401) {
      console.warn(`WorkoutX API key failed with status ${res.status}, trying backup...`);
      continue;
    }

    // For other errors (500, etc), break immediately
    break;
  }

  if (lastRes) {
    throw new Error(STATUS_MESSAGES[lastRes.status] ?? `WorkoutX error ${lastRes.status}`);
  }

  throw new Error('No valid WorkoutX API keys available.');
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
