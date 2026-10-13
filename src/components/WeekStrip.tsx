import type { Routine, MuscleGroup } from '../types';
import { parseMuscleGroups, isRestRoutine } from '../types';
import './WeekStrip.css';

interface Props {
  plan: Routine[];
  todayIndex: number;
  progressMap?: Map<string, number>;
}

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatStripMuscle(groups: MuscleGroup[]): string {
  if (groups.length === 1 && groups[0] === 'Rest') return 'Rest';
  if (groups.length === 1) return groups[0].slice(0, 3);
  if (groups.length === 2) return `${groups[0].slice(0, 2)}/${groups[1].slice(0, 2)}`;
  return groups.map(g => g[0]).join('+');
}

export default function WeekStrip({ plan, todayIndex, progressMap }: Props) {
  return (
    <div className="week-strip">
      {plan.map((r, i) => {
        const isToday = i === todayIndex;
        const isRest  = isRestRoutine(r.muscle_group);
        const groups  = parseMuscleGroups(r.muscle_group);
        const label   = formatStripMuscle(groups);
        const progress = isRest ? 1 : (r.completed ? 1 : (progressMap?.get(r.id) ?? 0));
        const isDone  = r.completed || progress >= 1;
        const pct     = Math.round(progress * 100);

        return (
          <div
            key={r.day}
            className={`ws-day ${isToday ? 'ws-day--today' : ''} ${isDone ? 'ws-day--done' : ''} ${isRest ? 'ws-day--rest' : ''}`}
          >
            <span className="ws-label">{SHORT[i]}</span>
            <div className={`ws-dot ${progress > 0 && !isDone ? 'ws-dot--in-progress' : ''}`}>
              {isRest ? (
                '—'
              ) : isDone ? (
                '✓'
              ) : progress > 0 ? (
                <>
                  <svg className="ws-dot-ring" viewBox="0 0 26 26">
                    <circle cx="13" cy="13" r="10" className="ws-ring-track" />
                    <circle
                      cx="13"
                      cy="13"
                      r="10"
                      className="ws-ring-fill"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress)}`}
                    />
                  </svg>
                  <span className="ws-dot-pct">{pct}%</span>
                </>
              ) : (
                ''
              )}
            </div>
            <span className="ws-muscle" title={groups.join(', ')}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
