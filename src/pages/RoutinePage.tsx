import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
   const { routines, loading: rLoading, toggleComplete, setMuscleGroup } = useRoutines();

   const routine = routines.find(r => r.day.toLowerCase() === day?.toLowerCase());
   const { exercises, loading: exLoading, add, remove, update } = useExercises(routine?.id);

   const [showModal, setShowModal] = useState(false);
   const [editingGroup, setEditingGroup] = useState(false);

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
                  onClick={() => toggleComplete(routine)}
               >
                  {routine.completed ? '✓ Completed' : '○ Mark Done'}
               </button>
            </div>

            {/* Header */}
            <header className="rp__header">
               <h1 className="rp__day">{routine.day}</h1>
               <div className="rp__group-row">
                  <div onClick={() => setEditingGroup(g => !g)} style={{ cursor: 'pointer' }}>
                     <MuscleGroupBadge group={routine.muscle_group} size="lg" />
                  </div>
                  {!isRest && <span className="rp__ex-count">{exercises.length} exercises</span>}
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
                        {exercises.map(ex => (
                           <ExerciseCard
                              key={ex.id}
                              exercise={ex}
                              muscleGroup={routine.muscle_group}
                              onUpdate={update}
                              onRemove={remove}
                           />
                        ))}
                     </div>
                  )}

                  <button className="rp__add-btn" onClick={() => setShowModal(true)}>
                     + Add Exercise
                  </button>
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
