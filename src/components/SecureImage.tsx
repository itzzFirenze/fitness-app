import { useState, useEffect } from 'react';
import { getOrFetchGif } from '../lib/gifStorage';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  onResolved?: (supabaseUrl: string) => void;
}

export default function SecureImage({ src, onResolved, ...props }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      setObjectUrl(null);
      return;
    }

    // If it's not a WorkoutX URL, just use it directly
    if (!src.includes('api.workoutxapp.com')) {
      setObjectUrl(src);
      return;
    }

    let isMounted = true;

    getOrFetchGif(src)
      .then(result => {
        if (!isMounted) return;
        setObjectUrl(result.url);
        if (result.supabaseUrl && onResolved) {
          onResolved(result.supabaseUrl);
        }
      })
      .catch(err => {
        console.warn('SecureImage getOrFetchGif error:', err);
        if (isMounted) setObjectUrl(src);
      });

    return () => {
      isMounted = false;
    };
  }, [src, onResolved]);

  if (!objectUrl) {
    // Return a skeleton/placeholder while loading
    return <div className={`secure-image-skeleton ${props.className || ''}`} style={{ background: 'var(--surface-2)', ...props.style }} />;
  }

  return <img src={objectUrl} {...props} />;
}

