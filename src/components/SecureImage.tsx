import { useState, useEffect } from 'react';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

const KEYS = [
  import.meta.env.VITE_API_WORKOUTX,
  import.meta.env.VITE_API_WORKOUTX_BACKUP1,
  import.meta.env.VITE_API_WORKOUTX_BACKUP2
].filter(Boolean) as string[];

// Cache blobs in memory so we don't re-fetch the same GIF multiple times
const blobCache = new Map<string, string>();

export default function SecureImage({ src, ...props }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;

    // If it's not a WorkoutX URL, just use it directly
    if (!src.includes('api.workoutxapp.com')) {
      setObjectUrl(src);
      return;
    }

    if (blobCache.has(src)) {
      setObjectUrl(blobCache.get(src)!);
      return;
    }

    let isMounted = true;

    async function fetchImage() {
      if (KEYS.length === 0) {
        console.error('No WorkoutX API keys configured');
        return;
      }

      let success = false;
      for (const key of KEYS) {
        if (key.includes('placeholder')) continue;
        try {
          const res = await fetch(src, {
            headers: {
              'X-WorkoutX-Key': key,
            },
          });
          
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            
            blobCache.set(src, url);
            if (isMounted) setObjectUrl(url);
            success = true;
            break;
          } else {
            console.warn(`SecureImage fetch failed with status ${res.status} for backup key.`);
          }
        } catch (err) {
          console.warn('Error fetching secure image with key:', err);
        }
      }

      if (!success) {
        console.error('Failed to load secure image with all available keys.');
      }
    }

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!objectUrl) {
    // Return a skeleton/placeholder while loading
    return <div className={`secure-image-skeleton ${props.className || ''}`} style={{ background: 'var(--surface-2)', ...props.style }} />;
  }

  return <img src={objectUrl} {...props} />;
}
