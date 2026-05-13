import type { MuscleGroup } from '../types';

interface Props {
   group: MuscleGroup;
   size?: 'sm' | 'md' | 'lg';
}

const muscleConfig: Record<MuscleGroup, { emoji: string; color: string; bg: string }> = {
   Back: { emoji: '🏋️', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
   Chest: { emoji: '💪', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
   Biceps: { emoji: '💪', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
   Triceps: { emoji: '🦾', color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
   Shoulders: { emoji: '🔵', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
   Arms: { emoji: '💥', color: '#fb923c', bg: 'rgba(251,146,60,0.15)' },
   Legs: { emoji: '🦵', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
   Core: { emoji: '🔥', color: '#facc15', bg: 'rgba(250,204,21,0.15)' },
   Cardio: { emoji: '🏃', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
   Rest: { emoji: '😴', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

const sizeMap = { sm: 20, md: 28, lg: 40 };
const fontMap = { sm: '0.65rem', md: '0.75rem', lg: '0.9rem' };

export default function MuscleGroupBadge({ group, size = 'md' }: Props) {
   const { emoji, color, bg } = muscleConfig[group];
   const px = sizeMap[size];
   const fs = fontMap[size];

   return (
      <span
         style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: `${px * 0.22}px ${px * 0.55}px`,
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
         <span style={{ fontSize: `${px * 0.55}px` }}>{emoji}</span>
         {group.toUpperCase()}
      </span>
   );
}
