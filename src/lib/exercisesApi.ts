export interface ApiExercise {
   name: string;
   type: string;
   muscle: string;
   equipment: string;
   difficulty: string;
   instructions: string;
}

// Maps our muscle groups → API Ninjas muscle param values
export const MUSCLE_MAP: Record<string, string[]> = {
   Back: ['lats', 'middle_back', 'lower_back'],
   Chest: ['chest'],
   Biceps: ['biceps'],
   Triceps: ['triceps'],
   Shoulders: ['traps'],
   Arms: ['biceps', 'triceps', 'forearms'],
   Legs: ['quadriceps', 'hamstrings', 'glutes', 'calves'],
   Core: ['abdominals'],
   Cardio: [],
   Rest: [],
};

const BASE = 'https://api.api-ninjas.com/v1/exercises';
const KEY = import.meta.env.VITE_API_NINJAS_KEY as string;

const STATUS_MESSAGES: Record<number, string> = {
   400: 'Invalid API key — go to api-ninjas.com → My Account and copy your key exactly into VITE_API_NINJAS_KEY in .env',
   401: 'Unauthorized — your API Ninjas key is wrong. Check VITE_API_NINJAS_KEY in .env',
   429: 'Rate limited — too many requests. Try again in a minute.',
};

export async function fetchExercises(params: {
   name?: string;
   muscle?: string;
   limit?: number;
}): Promise<ApiExercise[]> {
   // API Ninjas requires at least one filter parameter
   if (!params.name && !params.muscle) return [];

   const q = new URLSearchParams();
   if (params.name) q.set('name', params.name);
   if (params.muscle) q.set('muscle', params.muscle);
   q.set('limit', String(params.limit ?? 15));

   const res = await fetch(`${BASE}?${q}`, {
      headers: { 'X-Api-Key': KEY || '' },
   });

   if (!res.ok) {
      throw new Error(STATUS_MESSAGES[res.status] ?? `API Ninjas error ${res.status}`);
   }

   return res.json();
}
