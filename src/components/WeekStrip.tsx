import type { Routine } from '../types';
import './WeekStrip.css';

interface Props {
  plan: Routine[];
  todayIndex: number;
}

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekStrip({ plan, todayIndex }: Props) {
  return (
    <div className="week-strip">
      {plan.map((r, i) => {
        const isToday = i === todayIndex;
        const isRest  = r.muscle_group === 'Rest';
        return (
          <div key={r.day} className={`ws-day ${isToday ? 'ws-day--today' : ''} ${r.completed ? 'ws-day--done' : ''} ${isRest ? 'ws-day--rest' : ''}`}>
            <span className="ws-label">{SHORT[i]}</span>
            <div className="ws-dot">{r.completed ? '✓' : isRest ? '—' : ''}</div>
            <span className="ws-muscle">{isRest ? 'Rest' : r.muscle_group.slice(0, 3)}</span>
          </div>
        );
      })}
    </div>
  );
}
