import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useRoutines, useExercises } from '../hooks/useRoutines';
import ExerciseCard from '../components/ExerciseCard';
import ExerciseSearchModal from '../components/ExerciseSearchModal';
import MuscleGroupBadge from '../components/MuscleGroupBadge';
import type { MuscleGroup } from '../types';
import './RoutinePage.css';

const ALL_GROUPS: MuscleGroup[] = [
   'Back', 'Chest', 'Biceps', 'Triceps', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Rest',
];

export default function RoutinePage() {
   const { day } = useParams<{ day: string }>();
   const navigate = useNavigate();
   const { routines, loading: rLoading, updateRoutine, setMuscleGroup } = useRoutines();

   const routine = routines.find(r => r.day.toLowerCase() === day?.toLowerCase());
   const { exercises, loading: exLoading, add, remove, update, saveOrder } = useExercises(routine?.id);

   const [showModal, setShowModal] = useState(false);
   const [editingGroup, setEditingGroup] = useState(false);
   
   // Drag and drop local state
   const [isReordering, setIsReordering] = useState(false);
   const [localExercises, setLocalExercises] = useState(exercises);

   // Sync local exercises when exercises change (only if not reordering)
   useEffect(() => {
     if (!isReordering) {
       setLocalExercises(exercises);
     }
   }, [exercises, isReordering]);

   const handleDragEnd = (result: DropResult) => {
     if (!result.destination) return;
     const items = Array.from(localExercises);
     const [reorderedItem] = items.splice(result.source.index, 1);
     items.splice(result.destination.index, 0, reorderedItem);
     setLocalExercises(items);
   };

   const handleSaveOrder = async () => {
     await saveOrder(localExercises);
     setIsReordering(false);
   };

   const handleCancelOrder = () => {
     setLocalExercises(exercises);
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

   const isRest = routine.muscle_group === 'Rest';

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
               <div className="rp__group-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                     <div onClick={() => !isReordering && setEditingGroup(g => !g)} style={{ cursor: isReordering ? 'default' : 'pointer' }}>
                        <MuscleGroupBadge group={routine.muscle_group} size="lg" />
                     </div>
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
                           <button onClick={() => setIsReordering(true)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Reorder</button>
                        )}
                     </div>
                  )}
               </div>
               {editingGroup && (
                  <div className="rp__group-picker">
                     {ALL_GROUPS.map(g => (
                        <button
                           key={g}
                           className={`rp__gp-pill ${routine.muscle_group === g ? 'active' : ''}`}
                           onClick={() => { setMuscleGroup(routine, g); setEditingGroup(false); }}
                        >{g}</button>
                     ))}
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
                                       <Draggable key={ex.id} draggableId={ex.id} index={index} isDragDisabled={!isReordering}>
                                          {(provided) => (
                                             <div ref={provided.innerRef} {...provided.draggableProps} style={{ ...provided.draggableProps.style }}>
                                                <ExerciseCard
                                                   exercise={ex}
                                                   muscleGroup={routine.muscle_group}
                                                   onUpdate={update}
                                                   onRemove={remove}
                                                   isReordering={isReordering}
                                                   dragHandleProps={provided.dragHandleProps}
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
                        <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>+</span> Add Exercise
                     </button>
                  )}
               </>
            )}
         </div>

         {showModal && routine && (
            <ExerciseSearchModal
               routineId={routine.id}
               muscleGroup={routine.muscle_group}
               onAdd={add}
               onClose={() => setShowModal(false)}
            />
         )}
      </div>
   );
}
