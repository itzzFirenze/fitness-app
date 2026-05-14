import { useState, useEffect } from 'react';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

const KEY = import.meta.env.VITE_API_WORKOUTX as string;

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
      try {
        const res = await fetch(src, {
          headers: {
            'X-WorkoutX-Key': KEY || '',
          },
        });
        
        if (!res.ok) throw new Error('Failed to load image');
        
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        
        blobCache.set(src, url);
        if (isMounted) setObjectUrl(url);
      } catch (err) {
        console.error('Error fetching secure image:', err);
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
