import { useState, useRef } from 'react';
import { Pencil, Trash2, Menu } from 'lucide-react';
import type { Exercise, SetEntry } from '../types';
import { makeDefaultSets } from '../types';
import { supabase } from '../lib/supabase';
import SecureImage from './SecureImage';
import './ExerciseCard.css';

interface Props {
  exercise: Exercise;
  muscleGroup: string;
  onUpdate: (id: string, patch: Partial<Exercise>) => void;
  onRemove: (id: string) => void;
  isReordering?: boolean;
  dragHandleProps?: any;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  strength:              { icon: '🏋️', color: '#818cf8', bg: '#1e1b4b' },
  cardio:                { icon: '🏃', color: '#34d399', bg: '#022c22' },
  stretching:            { icon: '🧘', color: '#c084fc', bg: '#2e1065' },
  plyometrics:           { icon: '⚡', color: '#fb923c', bg: '#431407' },
  olympic_weightlifting: { icon: '🥇', color: '#60a5fa', bg: '#172554' },
  powerlifting:          { icon: '💪', color: '#f472b6', bg: '#500724' },
};
const FALLBACK_TYPE = { icon: '🏋️', color: '#818cf8', bg: '#1e1b4b' };

function typeConfig(t: string) {
  return TYPE_CONFIG[t?.toLowerCase()] ?? FALLBACK_TYPE;
}

function getEffectiveSets(ex: Exercise): SetEntry[] {
  if (Array.isArray(ex.set_data) && ex.set_data.length > 0) return ex.set_data;
  return makeDefaultSets(ex.sets ?? 3, ex.reps ?? '10', ex.weight ?? '');
}

function uid() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function ExerciseCard({ exercise: ex, muscleGroup, onUpdate, onRemove, isReordering, dragHandleProps }: Props) {
  const [expanded,     setExpanded]     = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [nameDraft,    setNameDraft]    = useState(ex.name);
  const [showImgForm,  setShowImgForm]  = useState(false);
  const [imgTab,       setImgTab]       = useState<'file' | 'url'>('file');
  const [imgDraft,     setImgDraft]     = useState(ex.image_url ?? '');
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const cfg       = typeConfig(ex.exercise_type);
  const sets      = getEffectiveSets(ex);
  const hasImage  = Boolean(ex.image_url);
  const allCompleted = sets.length > 0 && sets.every(s => s.completed);

  /* ── Set helpers ─────────────────────────────────────── */
  const saveSets = (next: SetEntry[]) =>
    onUpdate(ex.id, { set_data: next, sets: next.length });

  const toggleAllSets = () => {
    const nextState = !allCompleted;
    saveSets(sets.map(s => ({ ...s, completed: nextState })));
  };

  const patchSet = (id: string, field: 'reps' | 'weight', val: string) =>
    saveSets(sets.map(s => s.id === id ? { ...s, [field]: val } : s));

  const addSet = () => {
    const last = sets[sets.length - 1];
    saveSets([...sets, { id: uid(), reps: last?.reps ?? '10', weight: last?.weight ?? '', completed: false }]);
  };

  const deleteSet = (id: string) => {
    if (sets.length <= 1) return;
    saveSets(sets.filter(s => s.id !== id));
  };

  /* ── Name ────────────────────────────────────────────── */
  const saveName = () => {
    if (nameDraft.trim()) onUpdate(ex.id, { name: nameDraft.trim() });
    setEditingName(false);
  };

  /* ── Image: file upload ──────────────────────────────── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    // Sanitise filename & build storage path
    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `${ex.id}/image.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('exercise-images')
      .upload(path, file, { upsert: true });

    if (upErr) {
      setUploadError(upErr.message.includes('Bucket not found')
        ? 'Storage bucket not found. Create a public bucket called "exercise-images" in Supabase → Storage.'
        : upErr.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('exercise-images')
      .getPublicUrl(path);

    onUpdate(ex.id, { image_url: urlData.publicUrl });
    setUploading(false);
    setShowImgForm(false);

    // Reset file input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── Image: URL save ─────────────────────────────────── */
  const saveUrl = () => {
    onUpdate(ex.id, { image_url: imgDraft.trim() });
    setShowImgForm(false);
  };

  const clearImage = () => {
    onUpdate(ex.id, { image_url: '' });
    setImgDraft('');
    setShowImgForm(false);
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className={`ec ${expanded ? 'ec--open' : ''}`}>

      {/* Header */}
      <div className="ec__header">

        {/* Avatar — click to open image picker */}
        <button
          className="ec__avatar"
          style={{ background: hasImage ? 'transparent' : cfg.bg, cursor: isReordering ? 'default' : 'pointer' }}
          onClick={() => { if (!isReordering) { setShowImgForm(v => !v); setExpanded(true); } }}
          title={isReordering ? '' : 'Add / change image'}
        >
          {hasImage
            ? <SecureImage src={ex.image_url} alt={ex.name} className="ec__avatar-img"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span className="ec__avatar-icon">{cfg.icon}</span>
          }
          <span className="ec__avatar-overlay">🖼️</span>
        </button>

        {/* Name + meta */}
        <div className="ec__info" onClick={() => !isReordering && setExpanded(v => !v)} style={{ cursor: isReordering ? 'default' : 'pointer' }}>
          {editingName ? (
            <input
              className="ec__name-edit"
              value={nameDraft}
              autoFocus
              onChange={e => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="ec__name">{ex.name}</span>
          )}
          <div className="ec__meta">
            <span className="ec__type">{muscleGroup}</span>
          </div>
        </div>

        {/* Icons */}
        <div className="ec__actions">
          {isReordering ? (
            <div className="ec__drag-handle" {...dragHandleProps} style={{ cursor: 'grab', padding: '8px', color: 'var(--text-3)' }}>
              <Menu size={20} />
            </div>
          ) : (
            <>
              <button className="ec__ic" title="Mark complete" onClick={e => { e.stopPropagation(); toggleAllSets(); }}
                style={{ color: allCompleted ? '#4ade80' : 'rgba(255, 255, 255, 0.2)' }}>
                ✓
              </button>
              <button className="ec__ic" title="Rename"
                onClick={e => { e.stopPropagation(); setEditingName(true); setExpanded(true); }}>
                <Pencil size={18} />
              </button>
              <button className="ec__ic ec__ic--del" title="Delete" onClick={e => { e.stopPropagation(); onRemove(ex.id); }}>
                <Trash2 size={18} />
              </button>
              <span className={`ec__chev ${expanded ? 'open' : ''}`}
                onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}>›</span>
            </>
          )}
        </div>
      </div>

      {/* Image picker panel */}
      {showImgForm && (
        <div className="ec__img-panel">
          {/* Tab switch */}
          <div className="ec__img-tabs">
            <button
              className={`ec__img-tab ${imgTab === 'file' ? 'active' : ''}`}
              onClick={() => setImgTab('file')}
            >📁 Upload File</button>
            <button
              className={`ec__img-tab ${imgTab === 'url' ? 'active' : ''}`}
              onClick={() => setImgTab('url')}
            >🔗 Paste URL</button>
          </div>

          {imgTab === 'file' ? (
            <div className="ec__img-upload">
              {/* Hidden real file input */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                className="ec__upload-area"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading
                  ? <><span className="upload-spinner" />Uploading…</>
                  : <><span>📷</span><span>Click to choose a photo or GIF</span></>
                }
              </button>
              {uploadError && <p className="ec__img-error">{uploadError}</p>}
            </div>
          ) : (
            <div className="ec__img-url">
              <input
                className="ec__img-input"
                autoFocus
                value={imgDraft}
                placeholder="https://example.com/exercise.gif"
                onChange={e => setImgDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveUrl()}
              />
              <button className="ec__save-btn" onClick={saveUrl}>Set Image</button>
            </div>
          )}

          <div className="ec__img-footer">
            {hasImage && (
              <button className="ec__ghost-btn" onClick={clearImage}>
                <Trash2 size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
                Remove image
              </button>
            )}
            <button className="ec__ghost-btn" onClick={() => setShowImgForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Set tracker */}
      {expanded && (
        <div className="ec__body">
          <div className="set-table">
            <div className="set-head">
              <span>SET</span>
              <span>REPS</span>
              <span>WEIGHT</span>
              <span></span>
            </div>
            {sets.map((s, i) => (
              <div key={s.id} className={`set-row ${allCompleted ? 'set-row--done' : ''}`}>
                <span className="set-num">{i + 1}</span>
                <input className="set-inp" value={s.reps} placeholder="reps"
                  onChange={e => patchSet(s.id, 'reps', e.target.value)} />
                <input className="set-inp" value={s.weight} placeholder="kg"
                  onChange={e => patchSet(s.id, 'weight', e.target.value)} />
                <button className="set-rm" onClick={() => deleteSet(s.id)}
                  disabled={sets.length <= 1}>×</button>
              </div>
            ))}
          </div>
          <button className="set-add-btn" onClick={addSet}><span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>+</span> Add Set</button>
        </div>
      )}
    </div>
  );
}
