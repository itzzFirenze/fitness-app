import { useState } from 'react';
import type { MuscleGroup } from '../types';

interface Props {
  group: MuscleGroup;
  size?: 'sm' | 'md' | 'lg';
}

const muscleConfig: Record<MuscleGroup, { emoji: string; color: string; bg: string }> = {
  Back:      { emoji: '🏋️', color: '#FB3640', bg: 'rgba(251,54,64,0.15)'   },
  Chest:     { emoji: '💪',  color: '#ff6d72', bg: 'rgba(255,109,114,0.15)' },
  Biceps:    { emoji: '💪',  color: '#ff6d72', bg: 'rgba(255,109,114,0.15)' },
  Triceps:   { emoji: '🦾',  color: '#c82030', bg: 'rgba(200,32,48,0.15)'   },
  Shoulders: { emoji: '🔵',  color: '#fb923c', bg: 'rgba(251,146,60,0.15)'  },
  Arms:      { emoji: '💥',  color: '#facc15', bg: 'rgba(250,204,21,0.15)'  },
  Legs:      { emoji: '🦵',  color: '#4ade80', bg: 'rgba(74,222,128,0.15)'  },
  Core:      { emoji: '🔥',  color: '#fb923c', bg: 'rgba(251,146,60,0.15)'  },
  Cardio:    { emoji: '🏃',  color: '#34d399', bg: 'rgba(52,211,153,0.15)'  },
  Rest:      { emoji: '😴',  color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const imgSizeMap = { sm: 14, md: 18, lg: 26 };
const fontMap    = { sm: '0.65rem', md: '0.75rem', lg: '0.9rem' };
const padMap     = { sm: '3px 8px', md: '4px 10px', lg: '6px 14px' };

/** Tries /muscles/{group}.png — shows emoji if the file doesn't exist */
function MuscleIcon({ group, px, emoji }: { group: MuscleGroup; px: number; emoji: string }) {
  const [failed, setFailed] = useState(false);
  const src = `/muscles/${group.toLowerCase()}.png`;

  if (failed) {
    return <span style={{ fontSize: px, lineHeight: 1 }}>{emoji}</span>;
  }

  return (
    <img
      src={src}
      alt={group}
      width={px}
      height={px}
      style={{ objectFit: 'contain', display: 'block', flexShrink: 0, filter: 'invert(1)' }}
      onError={() => setFailed(true)}
    />
  );
}

export default function MuscleGroupBadge({ group, size = 'md' }: Props) {
  const { emoji, color, bg } = muscleConfig[group];
  const px  = imgSizeMap[size];
  const fs  = fontMap[size];
  const pad = padMap[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: pad,
        borderRadius: 999,
        background: bg,
        border: `1px solid ${color}44`,
        color,
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: 0.4,
        whiteSpace: 'nowrap',
      }}
    >
      <MuscleIcon group={group} px={px} emoji={emoji} />
      {group.toUpperCase()}
    </span>
  );
}
