import { useState, useEffect, useRef } from 'react';
import type { Exercise, MuscleGroup } from '../types';
import { makeDefaultSets } from '../types';
import { fetchExercises, MUSCLE_MAP, type ApiExercise } from '../lib/exercisesApi';
import './ExerciseSearchModal.css';

interface Props {
  routineId: string;
  muscleGroup: MuscleGroup;
  onAdd: (ex: Omit<Exercise, 'id' | 'order_index'>) => Promise<unknown>;
  onClose: () => void;
}

type Tab = 'search' | 'manual';



export default function ExerciseSearchModal({ routineId, muscleGroup, onAdd, onClose }: Props) {
  const [tab,         setTab]         = useState<Tab>('search');
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<ApiExercise[]>([]);
  const [searching,   setSearching]   = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [selected,    setSelected]    = useState<ApiExercise | null>(null);
  const [saving,      setSaving]      = useState(false);

  // Manual form
  const [manual, setManual] = useState({ name: '', sets: 3, reps: '10', weight: '' });

  // Details form (after picking from API)
  const [details, setDetails] = useState({ sets: 3, reps: '10', weight: '' });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-load muscle group exercises on open
  useEffect(() => {
    const muscles = MUSCLE_MAP[muscleGroup] ?? [];
    if (muscles.length === 0) return;
    searchApi('', muscles[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muscleGroup]);

  const searchApi = async (name: string, muscle?: string) => {
    setSearching(true);
    setApiError('');
    try {
      const data = await fetchExercises({ name: name || undefined, muscle });
      setResults(data);
    } catch (e: unknown) {
      setApiError((e as Error).message ?? 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchApi(val), 600);
  };

  const handleSelect = (ex: ApiExercise) => {
    setSelected(ex);
    setDetails({ sets: 3, reps: '10', weight: '' });
  };

  const handleConfirmApi = async () => {
    if (!selected) return;
    setSaving(true);
    await onAdd({
      routine_id:    routineId,
      name:          selected.name,
      exercise_type: selected.type,
      image_url:     '',
      set_data:      makeDefaultSets(details.sets, details.reps, details.weight),
      ...details,
    });
    setSaving(false);
    setSelected(null);
  };

  const handleManualAdd = async () => {
    if (!manual.name.trim()) return;
    setSaving(true);
    await onAdd({
      routine_id:    routineId,
      exercise_type: 'strength',
      image_url:     '',
      set_data:      makeDefaultSets(manual.sets, manual.reps, manual.weight),
      ...manual,
    });
    setSaving(false);
    setManual({ name: '', sets: 3, reps: '10', weight: '' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Add Exercise</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="modal__tabs">
          <button className={`modal__tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
            🔍 Search API
          </button>
          <button className={`modal__tab ${tab === 'manual' ? 'active' : ''}`} onClick={() => setTab('manual')}>
            ✏️ Manual Entry
          </button>
        </div>

        {/* ── Search tab ── */}
        {tab === 'search' && (
          <div className="modal__body">
            {selected ? (
              /* Confirm form after selecting an exercise */
              <div className="confirm-form">
                <div className="confirm-header">
                  <button className="back-btn" onClick={() => setSelected(null)}>← Back</button>
                  <h3>{selected.name}</h3>
                  <span className="api-tag">{selected.muscle} · {selected.difficulty}</span>
                </div>
                {selected.instructions && (
                  <p className="instructions">{selected.instructions.slice(0, 180)}…</p>
                )}
                <div className="detail-grid">
                  <div className="ec-field">
                    <label>Sets</label>
                    <input type="number" min={1} value={details.sets}
                      onChange={e => setDetails({ ...details, sets: +e.target.value })} />
                  </div>
                  <div className="ec-field">
                    <label>Reps</label>
                    <input value={details.reps} placeholder="8-12"
                      onChange={e => setDetails({ ...details, reps: e.target.value })} />
                  </div>
                  <div className="ec-field">
                    <label>Weight</label>
                    <input value={details.weight} placeholder="e.g. 60kg"
                      onChange={e => setDetails({ ...details, weight: e.target.value })} />
                  </div>
                </div>
                <button className="btn-add-big" disabled={saving} onClick={handleConfirmApi}>
                  {saving ? 'Adding…' : '+ Add to Routine'}
                </button>
              </div>
            ) : (
              <>
                <input
                  className="search-input"
                  placeholder={`Search exercises (showing ${muscleGroup} by default)…`}
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  autoFocus
                />
                {/* Quick muscle filter chips */}
                <div className="muscle-chips">
                  {(MUSCLE_MAP[muscleGroup] ?? []).map(m => (
                    <button key={m} className="muscle-chip" onClick={() => searchApi('', m)}>
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {apiError && <p className="api-error">⚠️ {apiError} — check your API key in .env</p>}

                {searching ? (
                  <div className="search-loading">Searching…</div>
                ) : results.length === 0 ? (
                  <p className="no-results">No results. Try a different search term.</p>
                ) : (
                  <div className="results-list">
                    {results.map(ex => (
                      <div key={ex.name} className="result-item" onClick={() => handleSelect(ex)}>
                        <div className="result-item__name">{ex.name}</div>
                        <div className="result-item__meta">
                          <span>{ex.muscle}</span>
                          <span>{ex.equipment}</span>
                          <span className={`diff diff--${ex.difficulty}`}>{ex.difficulty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Manual tab ── */}
        {tab === 'manual' && (
          <div className="modal__body">
            <div className="manual-grid">
              <div className="ec-field span-full">
                <label>Exercise name *</label>
                <input
                  autoFocus
                  value={manual.name}
                  placeholder="e.g. Bench Press"
                  onChange={e => setManual({ ...manual, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                />
              </div>
              <div className="ec-field">
                <label>Sets</label>
                <input type="number" min={1} value={manual.sets}
                  onChange={e => setManual({ ...manual, sets: +e.target.value })} />
              </div>
              <div className="ec-field">
                <label>Reps</label>
                <input value={manual.reps} placeholder="8-12"
                  onChange={e => setManual({ ...manual, reps: e.target.value })} />
              </div>
              <div className="ec-field">
                <label>Weight</label>
                <input value={manual.weight} placeholder="e.g. 60kg"
                  onChange={e => setManual({ ...manual, weight: e.target.value })} />
              </div>
            </div>
            <button className="btn-add-big" disabled={saving || !manual.name.trim()} onClick={handleManualAdd}>
              {saving ? 'Adding…' : '+ Add Exercise'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
