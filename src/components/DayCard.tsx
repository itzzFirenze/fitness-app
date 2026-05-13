import { useNavigate } from 'react-router-dom';
import type { Routine } from '../types';
import MuscleGroupBadge from './MuscleGroupBadge';
import './DayCard.css';

interface Props {
  routine: Routine;
  isToday: boolean;
  onToggle: () => void;
}

export default function DayCard({ routine, isToday, onToggle }: Props) {
  const navigate = useNavigate();
  const isRest   = routine.muscle_group === 'Rest';

  return (
    <div
      className={`dc ${routine.completed ? 'dc--done' : ''} ${isToday ? 'dc--today' : ''}`}
      onClick={() => navigate(`/routine/${routine.day.toLowerCase()}`)}
      role="button"
    >
      <div className="dc__left">
        {isToday && <span className="dc__today-pill">TODAY</span>}
        <span className="dc__day">{routine.day}</span>
        <MuscleGroupBadge group={routine.muscle_group} size="sm" />
      </div>

      <div className="dc__right">
        {!isRest && (
          <button
            className={`dc__check ${routine.completed ? 'dc__check--done' : ''}`}
            onClick={e => { e.stopPropagation(); onToggle(); }}
            title={routine.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {routine.completed ? '✓' : '○'}
          </button>
        )}
        <span className="dc__arrow">›</span>
      </div>
    </div>
  );
}
