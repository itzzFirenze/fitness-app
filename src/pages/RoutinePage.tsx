import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useRoutines, useExercises } from '../hooks/useRoutines';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseSearchModal from '../components/ExerciseSearchModal';
import { MuscleGroupBadges, muscleConfig } from '../components/MuscleGroupBadge';
import type { MuscleGroup } from '../types';
import { parseMuscleGroups, isRestRoutine, ALL_WORKOUT_GROUPS } from '../types';
import { supabase } from '../lib/supabase';
import './RoutinePage.css';

const PRESETS: { label: string; groups: MuscleGroup[] }[] = [
   { label: 'Push (Chest/Sh/Tri)', groups: ['Chest', 'Shoulders', 'Triceps'] },
   { label: 'Pull (Back/Bi)', groups: ['Back', 'Biceps'] },
   { label: 'Chest & Triceps', groups: ['Chest', 'Triceps'] },
   { label: 'Back & Biceps', groups: ['Back', 'Biceps'] },
   { label: 'Legs & Core', groups: ['Legs', 'Core'] },
   { label: 'Shoulders & Arms', groups: ['Shoulders', 'Arms'] },
];

export default function RoutinePage() {
   const { day } = useParams<{ day: string }>();
   const navigate = useNavigate();
   const { routines, loading: rLoading, updateRoutine, setMuscleGroups } = useRoutines();

   const routine = routines.find(r => r.day.toLowerCase() === day?.toLowerCase());
   const { exercises, loading: exLoading, add, remove, update, saveOrder } = useExercises(routine?.id);

   const [showModal, setShowModal] = useState(false);
   const [editingGroup, setEditingGroup] = useState(false);

   // Drag and drop local state
   const [isReordering, setIsReordering] = useState(false);
   const [localExercises, setLocalExercises] = useState(exercises);
   const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

   // Sync local exercises when exercises change (only if not reordering)
   useEffect(() => {
      if (!isReordering) {
         setLocalExercises(exercises);
      }
   }, [exercises, isReordering]);

   // Wrapper so that patches (e.g. the area-switcher dropdown) also update
   // localExercises immediately — exercises alone isn't enough because the
   // sync effect above is intentionally skipped while isReordering is true.
   const handleExerciseUpdate = useCallback(
      (id: string, patch: Partial<Parameters<typeof update>[1]>) => {
         setLocalExercises(prev =>
            prev.map(e => (e.id === id ? { ...e, ...patch } : e))
         );
         update(id, patch as any);
      },
      [update]
   );

   const handleDragEnd = (result: DropResult) => {
      if (!result.destination) return;
      const items = Array.from(localExercises);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      setLocalExercises(items);
   };

   const togglePendingDelete = (id: string) => {
      setPendingDeleteIds(prev => {
         const next = new Set(prev);
         if (next.has(id)) {
            next.delete(id);
         } else {
            next.add(id);
         }
         return next;
      });
   };

   const handleSaveOrder = async () => {
      let remainingExercises = localExercises;
      if (pendingDeleteIds.size > 0) {
         const deleteIds = Array.from(pendingDeleteIds);
         await supabase.from('exercises').delete().in('id', deleteIds);
         remainingExercises = localExercises.filter(ex => !pendingDeleteIds.has(ex.id));
      }
      await saveOrder(remainingExercises);
      setPendingDeleteIds(new Set());
      setIsReordering(false);
   };

   const handleCancelOrder = () => {
      setLocalExercises(exercises);
      setPendingDeleteIds(new Set());
      setIsReordering(false);
   };

   // Auto-complete routine when all exercises are done
   useEffect(() => {
      if (!routine || exercises.length === 0) return;
      const allDone = exercises.every(ex => {
         const sets = ex.set_data || [];
         return sets.length > 0 && sets.every(s => s.completed);
      });
      if (routine.completed !== allDone) {
         updateRoutine(routine.id, { completed: allDone });
      }
   }, [exercises, routine, updateRoutine]);

   if (rLoading) return (
      <div className="rp-loading"><div className="spinner" /><p>Loading…</p></div>
   );
   if (!routine) return (
      <div className="rp-loading"><p>Routine not found.</p><button onClick={() => navigate('/')}>← Back</button></div>
   );

   const isRest = isRestRoutine(routine.muscle_group);
   const currentGroups = parseMuscleGroups(routine.muscle_group);

   const handleToggleMuscleGroup = (g: MuscleGroup) => {
      if (g === 'Rest') {
         setMuscleGroups(routine, ['Rest']);
         return;
      }
      if (isRest) {
         // Switch from Rest to this single workout area
         setMuscleGroups(routine, [g]);
         return;
      }
      if (currentGroups.includes(g)) {
         const next = currentGroups.filter(x => x !== g);
         setMuscleGroups(routine, next.length > 0 ? next : ['Rest']);
      } else {
         setMuscleGroups(routine, [...currentGroups, g]);
      }
   };

   const handleApplyPreset = (presetGroups: MuscleGroup[]) => {
      setMuscleGroups(routine, presetGroups);
   };

   return (
      <div className="app">
         <div className="rp">
            {/* Top nav */}
            <div className="rp__nav">
               <button className="rp__back" onClick={() => navigate('/')}>← Week</button>
               <button
                  className={`rp__complete-btn ${routine.completed ? 'done' : ''}`}
                  style={{ pointerEvents: 'none' }}
               >
                  {routine.completed ? '✓ Completed' : '○ Pending'}
               </button>
            </div>

            {/* Header */}
            <header className="rp__header">
               <h1 className="rp__day">{routine.day}</h1>
               <div className="rp__group-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                     <div
                        onClick={() => !isReordering && setEditingGroup(g => !g)}
                        style={{ cursor: isReordering ? 'default' : 'pointer' }}
                        title="Click to edit workout areas"
                     >
                        <MuscleGroupBadges groups={currentGroups} size="lg" />
                     </div>
                     <button
                        className="rp__edit-badge-btn"
                        onClick={() => !isReordering && setEditingGroup(g => !g)}
                     >
                        {editingGroup ? 'Done' : 'Change Areas ▾'}
                     </button>
                     {!isRest && <span className="rp__ex-count">{exercises.length} exercises</span>}
                  </div>
                  {!isRest && exercises.length > 1 && (
                     <div className="rp__reorder-actions" style={{ display: 'flex', gap: '8px' }}>
                        {isReordering ? (
                           <>
                              <button onClick={handleCancelOrder} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Cancel</button>
                              <button onClick={handleSaveOrder} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Save</button>
                           </>
                        ) : (
                           <button onClick={() => setIsReordering(true)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Edit Order</button>
                        )}
                     </div>
                  )}
               </div>

               {editingGroup && (
                  <div className="rp__group-picker-container">
                     <div className="rp__picker-title">
                        <span>Select Target Areas (Choose 1, 2, or more)</span>
                        <button className="rp__picker-close" onClick={() => setEditingGroup(false)}>Done</button>
                     </div>

                     {/* Workout area pills */}
                     <div className="rp__group-picker">
                        {ALL_WORKOUT_GROUPS.map(g => {
                           const active = !isRest && currentGroups.includes(g);
                           const cfg = muscleConfig[g];
                           return (
                              <button
                                 key={g}
                                 className={`rp__gp-pill ${active ? 'active' : ''}`}
                                 style={active ? { borderColor: cfg?.color, background: cfg?.bg, color: cfg?.color } : undefined}
                                 onClick={() => handleToggleMuscleGroup(g)}
                              >
                                 {active ? '✓ ' : '+ '}{g}
                              </button>
                           );
                        })}
                        <button
                           className={`rp__gp-pill rp__gp-pill--rest ${isRest ? 'active' : ''}`}
                           onClick={() => handleToggleMuscleGroup('Rest')}
                        >
                           {isRest ? '✓ ' : '😴 '}Rest Day
                        </button>
                     </div>

                     {/* Quick Split Presets */}
                     <div className="rp__presets-section">
                        <span className="rp__presets-title">Quick Splits:</span>
                        <div className="rp__presets-list">
                           {PRESETS.map(p => (
                              <button
                                 key={p.label}
                                 className="rp__preset-btn"
                                 onClick={() => handleApplyPreset(p.groups)}
                              >
                                 {p.label}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               )}
            </header>



            {/* Body */}
            {isRest ? (
               <div className="rp__rest">
                  <span>😴</span>
                  <p>Rest day — recover and recharge.</p>
                  <p className="hint">Tap the badge above to change this to a workout day.</p>
               </div>
            ) : (
               <>
                  {exLoading ? (
                     <div className="rp__ex-loading"><div className="spinner" /></div>
                  ) : exercises.length === 0 ? (
                     <div className="rp__empty">
                        <p>No exercises yet.</p>
                        <p>Tap the button below to add your first one!</p>
                     </div>
                  ) : (
                     <div className="rp__list">
                        <DragDropContext onDragEnd={handleDragEnd}>
                           <Droppable droppableId="exercises">
                              {(provided) => (
                                 <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {localExercises.map((ex, index) => (
                                       <Draggable key={ex.id} draggableId={ex.id} index={index} isDragDisabled={!isReordering || pendingDeleteIds.has(ex.id)}>
                                          {(provided) => (
                                             <div ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style }}>
                                                <ExerciseCard
                                                   exercise={ex}
                                                   muscleGroup={routine.muscle_group}
                                                   onUpdate={handleExerciseUpdate}
                                                   onRemove={isReordering ? () => togglePendingDelete(ex.id) : remove}
                                                   isReordering={isReordering}
                                                   dragHandleProps={provided.dragHandleProps}
                                                   isPendingDelete={pendingDeleteIds.has(ex.id)}
                                                />
                                             </div>
                                          )}
                                       </Draggable>
                                    ))}
                                    {provided.placeholder}
                                 </div>
                              )}
                           </Droppable>
                        </DragDropContext>
                     </div>
                  )}

                  {!isReordering && (
                     <button className="rp__add-btn" onClick={() => setShowModal(true)}>
                        + Add Exercise
                     </button>
                  )}
               </>
            )}
         </div>

         {showModal && routine && (
            <ExerciseSearchModal
               routineId={routine.id}
               muscleGroups={currentGroups}
               onAdd={add}
               onClose={() => setShowModal(false)}
            />
         )}
      </div>
   );
}
