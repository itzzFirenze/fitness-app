import { useState } from 'react';
import type { Exercise } from '../types';
import './ExerciseRow.css';

interface Props {
  exercise: Exercise;
  onUpdate: (ex: Exercise) => void;
  onRemove: (id: string) => void;
}

export default function ExerciseRow({ exercise, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(exercise);

  const save = () => {
    onUpdate(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(exercise);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="ex-row ex-row--editing">
        <div className="ex-edit-grid">
          <div className="ex-field">
            <label>Exercise</label>
            <input
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              placeholder="Exercise name"
            />
          </div>
          <div className="ex-field">
            <label>Sets</label>
            <input
              type="number"
              value={draft.sets}
              onChange={e => setDraft({ ...draft, sets: Number(e.target.value) })}
              min={1}
            />
          </div>
          <div className="ex-field">
            <label>Reps</label>
            <input
              value={draft.reps}
              onChange={e => setDraft({ ...draft, reps: e.target.value })}
              placeholder="e.g. 8-12"
            />
          </div>
          <div className="ex-field">
            <label>Weight</label>
            <input
              value={draft.weight ?? ''}
              onChange={e => setDraft({ ...draft, weight: e.target.value })}
              placeholder="e.g. 60kg"
            />
          </div>
        </div>
        <div className="ex-edit-actions">
          <button className="btn-save" onClick={save}>Save</button>
          <button className="btn-cancel" onClick={cancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ex-row">
      <div className="ex-main">
        <div className="ex-name">{exercise.name}</div>
        <div className="ex-meta">
          <span className="ex-chip">{exercise.sets} sets</span>
          <span className="ex-chip">{exercise.reps} reps</span>
          {exercise.weight && (
            <span className="ex-chip ex-chip--weight">{exercise.weight}</span>
          )}
        </div>
      </div>
      <div className="ex-actions">
        <button
          className="ex-btn ex-btn--edit"
          onClick={() => setEditing(true)}
          title="Edit"
        >
          ✏️
        </button>
        <button
          className="ex-btn ex-btn--delete"
          onClick={() => onRemove(exercise.id)}
          title="Remove"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
