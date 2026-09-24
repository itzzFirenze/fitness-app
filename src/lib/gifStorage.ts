import { supabase } from './supabase';

const BUCKET_NAME = 'exercise-images';

const KEYS = [
  import.meta.env.VITE_API_WORKOUTX,
  import.meta.env.VITE_API_WORKOUTX_BACKUP1,
  import.meta.env.VITE_API_WORKOUTX_BACKUP2,
].filter(Boolean) as string[];

// In-memory cache for fast lookup during the current session
const blobCache = new Map<string, string>();
const supabaseUrlCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<{ url: string; supabaseUrl: string | null }>>();

/**
 * Extracts a deterministic, safe storage path for a GIF URL.
 * e.g., "https://api.workoutxapp.com/v1/exercises/0001/gif" -> "gifs/0001.gif"
 */
export function getGifStoragePath(src: string): string {
  try {
    const parsed = new URL(src);
    const pathname = parsed.pathname;

    // Check if there is an exercise ID in path (e.g. /exercises/0001 or /exercises/0001/gif)
    const match = pathname.match(/\/exercises\/([a-zA-Z0-9_-]+)(?:\/gif|\.gif)?/i);
    if (match && match[1] && !['image', 'name', 'bodyPart', 'target'].includes(match[1])) {
      const id = match[1].replace(/\.gif$/i, '');
      return `gifs/${id}.gif`;
    }

    const clean = pathname
      .replace(/^\/+|\/+$/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    return `gifs/${clean}.gif`;
  } catch {
    const clean = src.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-50);
    return `gifs/${clean}.gif`;
  }
}

/**
 * Returns the public Supabase URL for a storage path.
 */
export function getSupabasePublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Retrieves a GIF:
 * 1. If not a WorkoutX URL (e.g. already in Supabase or local), returns it directly.
 * 2. Checks Supabase storage first. If found, returns the Supabase blob/URL (NO API call).
 * 3. If not in Supabase (first time), downloads from WorkoutX API, saves it to Supabase,
 *    and returns the loaded GIF.
 */
export async function getOrFetchGif(src: string): Promise<{ url: string; supabaseUrl: string | null }> {
  if (!src) {
    return { url: '', supabaseUrl: null };
  }

  // If it's already a non-WorkoutX URL (e.g., Supabase storage URL or local asset), use directly
  if (!src.includes('api.workoutxapp.com')) {
    return { url: src, supabaseUrl: src };
  }

  // In-memory cache hit
  if (blobCache.has(src)) {
    return {
      url: blobCache.get(src)!,
      supabaseUrl: supabaseUrlCache.get(src) ?? null,
    };
  }

  // Deduplicate concurrent requests for the exact same source
  if (inFlightRequests.has(src)) {
    return inFlightRequests.get(src)!;
  }

  const promise = (async () => {
    const storagePath = getGifStoragePath(src);
    const publicUrl = getSupabasePublicUrl(storagePath);

    // 1. Check if GIF is already stored in Supabase
    try {
      const { data: supaBlob, error: dlErr } = await supabase.storage
        .from(BUCKET_NAME)
        .download(storagePath);

      if (!dlErr && supaBlob) {
        // Successfully loaded from Supabase without any WorkoutX API call!
        const objectUrl = URL.createObjectURL(supaBlob);
        blobCache.set(src, objectUrl);
        supabaseUrlCache.set(src, publicUrl);
        return { url: objectUrl, supabaseUrl: publicUrl };
      }
    } catch (checkErr) {
      console.warn('Supabase storage check error:', checkErr);
    }

    // 2. First time: Download from WorkoutX API
    if (KEYS.length === 0) {
      console.error('No WorkoutX API keys configured');
      return { url: src, supabaseUrl: null };
    }

    let downloadedBlob: Blob | null = null;
    for (const key of KEYS) {
      if (key.includes('placeholder')) continue;
      try {
        const res = await fetch(src, {
          headers: { 'X-WorkoutX-Key': key },
        });

        if (res.ok) {
          downloadedBlob = await res.blob();
          break;
        } else {
          console.warn(`WorkoutX GIF fetch failed with status ${res.status}`);
        }
      } catch (fetchErr) {
        console.warn('Error fetching GIF with key:', fetchErr);
      }
    }

    if (!downloadedBlob) {
      console.error('Failed to download GIF from WorkoutX API with all available keys.');
      return { url: src, supabaseUrl: null };
    }

    // 3. Save downloaded GIF to Supabase storage
    try {
      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, downloadedBlob, {
          contentType: 'image/gif',
          upsert: true,
        });

      if (upErr) {
        console.warn('Failed to save GIF to Supabase storage:', upErr.message);
      } else {
        supabaseUrlCache.set(src, publicUrl);
      }
    } catch (upEx) {
      console.warn('Exception while uploading GIF to Supabase:', upEx);
    }

    const objectUrl = URL.createObjectURL(downloadedBlob);
    blobCache.set(src, objectUrl);
    return { url: objectUrl, supabaseUrl: publicUrl };
  })().finally(() => {
    inFlightRequests.delete(src);
  });

  inFlightRequests.set(src, promise);
  return promise;
}

/**
 * Ensures a GIF is stored in Supabase and returns its public URL.
 * Can be called when confirming an exercise to save the Supabase URL into the database.
 */
export async function ensureGifSavedToSupabase(src: string): Promise<string> {
  if (!src) return '';
  if (!src.includes('api.workoutxapp.com')) return src;

  try {
    const result = await getOrFetchGif(src);
    return result.supabaseUrl ?? src;
  } catch (err) {
    console.warn('Error ensuring GIF is saved to Supabase:', err);
    return src;
  }
}
