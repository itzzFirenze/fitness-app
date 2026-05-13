import { useState } from 'react';
import type { Exercise } from '../types';
import './ExerciseCard.css';

interface Props {
  exercise: Exercise;
  onUpdate: (id: string, patch: Partial<Exercise>) => void;
  onRemove: (id: string) => void;
}

export default function ExerciseCard({ exercise: ex, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(ex);

  if (editing) return (
    <div className="ec ec--editing">
      <div className="ec-grid">
        <div className="ec-field span2">
          <label>Exercise</label>
          <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="ec-field">
          <label>Sets</label>
          <input type="number" min={1} value={draft.sets}
            onChange={e => setDraft({ ...draft, sets: +e.target.value })} />
        </div>
        <div className="ec-field">
          <label>Reps</label>
          <input value={draft.reps} placeholder="8-12"
            onChange={e => setDraft({ ...draft, reps: e.target.value })} />
        </div>
        <div className="ec-field">
          <label>Weight</label>
          <input value={draft.weight} placeholder="60kg"
            onChange={e => setDraft({ ...draft, weight: e.target.value })} />
        </div>
      </div>
      <div className="ec-actions">
        <button className="btn-primary" onClick={() => { onUpdate(ex.id, draft); setEditing(false); }}>Save</button>
        <button className="btn-ghost"   onClick={() => { setDraft(ex); setEditing(false); }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="ec">
      <div className="ec__info">
        <span className="ec__name">{ex.name}</span>
        <div className="ec__chips">
          <span className="chip">{ex.sets} sets</span>
          <span className="chip">{ex.reps} reps</span>
          {ex.weight && <span className="chip chip--weight">{ex.weight}</span>}
        </div>
      </div>
      <div className="ec__btns">
        <button className="icon-btn" onClick={() => setEditing(true)}  title="Edit">✏️</button>
        <button className="icon-btn" onClick={() => onRemove(ex.id)}   title="Delete">🗑️</button>
      </div>
    </div>
  );
}
