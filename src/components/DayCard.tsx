import { useNavigate } from 'react-router-dom';
import type { Routine } from '../types';
import { parseMuscleGroups, isRestRoutine } from '../types';
import { MuscleGroupBadges } from './MuscleGroupBadge';
import './DayCard.css';

interface Props {
   routine: Routine;
   isToday: boolean;
   progress?: number;
   onToggleComplete?: (routine: Routine) => void;
}

export default function DayCard({ routine, isToday, progress = 0, onToggleComplete }: Props) {
   const navigate = useNavigate();
   const isRest = isRestRoutine(routine.muscle_group);
   const groups = parseMuscleGroups(routine.muscle_group);

   const isDone = routine.completed || progress >= 1;
   const currentProgress = isDone ? 1 : Math.max(0, Math.min(1, progress));
   const pct = Math.round(currentProgress * 100);

   return (
      <div
         className={`dc ${isDone ? 'dc--done' : ''} ${isToday ? 'dc--today' : ''} ${currentProgress > 0 && !isDone ? 'dc--in-progress' : ''}`}
         onClick={() => navigate(`/routine/${routine.day.toLowerCase()}`)}
         role="button"
      >
         <div className="dc__left">
            <span className="dc__day">{routine.day}</span>
            <div className="dc__badges">
               <MuscleGroupBadges groups={groups} size="sm" gap={4} />
            </div>
         </div>

         <div className="dc__right">
            {isToday && <span className="dc__today-pill">TODAY</span>}
            {!isRest && (
               <div
                  className={`dc__check ${isDone ? 'dc__check--done' : ''} ${currentProgress > 0 && !isDone ? 'dc__check--in-progress' : ''}`}
                  onClick={(e) => {
                     e.stopPropagation();
                     onToggleComplete?.(routine);
                  }}
                  role="button"
                  title={isDone ? "Mark incomplete" : `${pct > 0 ? `${pct}% done · ` : ''}Mark completed`}
               >
                  <svg className="dc__check-ring" viewBox="0 0 28 28">
                     <circle cx="14" cy="14" r="11" className="dc__ring-track" />
                     <circle
                        cx="14"
                        cy="14"
                        r="11"
                        className="dc__ring-fill"
                        strokeDasharray={`${2 * Math.PI * 11}`}
                        strokeDashoffset={`${2 * Math.PI * 11 * (1 - currentProgress)}`}
                     />
                  </svg>
                  <div className="dc__check-inner">
                     {isDone ? (
                        <span className="dc__check-tick">✓</span>
                     ) : currentProgress > 0 ? (
                        <span className="dc__check-pct">{pct}%</span>
                     ) : null}
                  </div>
               </div>
            )}
            <span className="dc__arrow">›</span>
         </div>
      </div>
   );
}
