import type { Routine, MuscleGroup } from '../types';
import { parseMuscleGroups, isRestRoutine } from '../types';
import './WeekStrip.css';

interface Props {
  plan: Routine[];
  todayIndex: number;
}

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatStripMuscle(groups: MuscleGroup[]): string {
  if (groups.length === 1 && groups[0] === 'Rest') return 'Rest';
  if (groups.length === 1) return groups[0].slice(0, 3);
  if (groups.length === 2) return `${groups[0].slice(0, 2)}/${groups[1].slice(0, 2)}`;
  return groups.map(g => g[0]).join('+');
}

export default function WeekStrip({ plan, todayIndex }: Props) {
  return (
    <div className="week-strip">
      {plan.map((r, i) => {
        const isToday = i === todayIndex;
        const isRest  = isRestRoutine(r.muscle_group);
        const groups  = parseMuscleGroups(r.muscle_group);
        const label   = formatStripMuscle(groups);
        return (
          <div key={r.day} className={`ws-day ${isToday ? 'ws-day--today' : ''} ${r.completed ? 'ws-day--done' : ''} ${isRest ? 'ws-day--rest' : ''}`}>
            <span className="ws-label">{SHORT[i]}</span>
            <div className="ws-dot">{r.completed ? '✓' : isRest ? '—' : ''}</div>
            <span className="ws-muscle" title={groups.join(', ')}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
