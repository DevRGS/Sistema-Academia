import { Exercise, filterExercisesByLimitations, MUSCLE_GROUPS, MuscleGroupFocus } from './exerciseService';
import type { Limitation, UserLimitations } from './exerciseService';

export type WorkoutTemplate = {
  name: string;
  muscle_group: string;
  exercises: Array<{
    name: string;
    sets: string;
    reps: string;
    rest: string;
  }>;
};

// Treino ABC padrão
const generateABCTemplate = (exercises: Exercise[]): WorkoutTemplate[] => {
  const workouts: WorkoutTemplate[] = [];
  
  // Treino A: Peito e Tríceps
  const chestExercises = exercises.filter(e => e.grupo === 'Peito').slice(0, 3);
  const tricepsExercises = exercises.filter(e => e.grupo === 'Braços' && e.subGrupo === 'Tríceps').slice(0, 2);
  
  workouts.push({
    name: 'Treino A - Peito e Tríceps',
    muscle_group: 'Peito/Tríceps',
    exercises: [
      ...chestExercises.map(e => ({
        name: e.exercicio,
        sets: '3-4',
        reps: '8-12',
        rest: '60-90s',
      })),
      ...tricepsExercises.map(e => ({
        name: e.exercicio,
        sets: '3',
        reps: '10-15',
        rest: '45-60s',
      })),
    ],
  });
  
  // Treino B: Costas e Bíceps
  const backExercises = exercises.filter(e => e.grupo === 'Costas').slice(0, 3);
  const bicepsExercises = exercises.filter(e => e.grupo === 'Braços' && e.subGrupo === 'Bíceps').slice(0, 2);
  
  workouts.push({
    name: 'Treino B - Costas e Bíceps',
    muscle_group: 'Costas/Bíceps',
    exercises: [
      ...backExercises.map(e => ({
        name: e.exercicio,
        sets: '3-4',
        reps: '8-12',
        rest: '60-90s',
      })),
      ...bicepsExercises.map(e => ({
        name: e.exercicio,
        sets: '3',
        reps: '10-15',
        rest: '45-60s',
      })),
    ],
  });
  
  // Treino C: Pernas e Ombros
  const legExercises = exercises.filter(e => e.grupo === 'Pernas').slice(0, 4);
  const shoulderExercises = exercises.filter(e => e.grupo === 'Ombros').slice(0, 2);
  
  workouts.push({
    name: 'Treino C - Pernas e Ombros',
    muscle_group: 'Pernas/Ombros',
    exercises: [
      ...legExercises.map(e => ({
        name: e.exercicio,
        sets: '3-4',
        reps: '8-12',
        rest: '60-90s',
      })),
      ...shoulderExercises.map(e => ({
        name: e.exercicio,
        sets: '3',
        reps: '10-15',
        rest: '45-60s',
      })),
    ],
  });
  
  return workouts;
};

// Treino Inicial (full body)
const generateBeginnerTemplate = (exercises: Exercise[]): WorkoutTemplate[] => {
  const filtered = exercises.filter(e => 
    e.nivel === 'Iniciante' || e.complexibilidade <= 2
  );
  
  return [{
    name: 'Treino Inicial - Corpo Inteiro',
    muscle_group: 'Full Body',
    exercises: [
      ...filtered.filter(e => e.grupo === 'Pernas').slice(0, 2).map(e => ({
        name: e.exercicio,
        sets: '2-3',
        reps: '10-15',
        rest: '60s',
      })),
      ...filtered.filter(e => e.grupo === 'Costas').slice(0, 2).map(e => ({
        name: e.exercicio,
        sets: '2-3',
        reps: '10-15',
        rest: '60s',
      })),
      ...filtered.filter(e => e.grupo === 'Peito').slice(0, 1).map(e => ({
        name: e.exercicio,
        sets: '2-3',
        reps: '10-15',
        rest: '60s',
      })),
      ...filtered.filter(e => e.grupo === 'Ombros').slice(0, 1).map(e => ({
        name: e.exercicio,
        sets: '2-3',
        reps: '10-15',
        rest: '60s',
      })),
      ...filtered.filter(e => e.grupo === 'Core').slice(0, 1).map(e => ({
        name: e.exercicio,
        sets: '2',
        reps: '12-20',
        rest: '45s',
      })),
    ],
  }];
};

// Treino Intermediário
const generateIntermediateTemplate = (exercises: Exercise[]): WorkoutTemplate[] => {
  return generateABCTemplate(exercises);
};

// Treino Avançado (Push/Pull/Legs)
const generateAdvancedTemplate = (exercises: Exercise[]): WorkoutTemplate[] => {
  // Push: Peito, Ombros, Tríceps
  const pushExercises = [
    ...exercises.filter(e => e.grupo === 'Peito').slice(0, 3),
    ...exercises.filter(e => e.grupo === 'Ombros').slice(0, 2),
    ...exercises.filter(e => e.grupo === 'Braços' && e.subGrupo === 'Tríceps').slice(0, 2),
  ];
  
  // Pull: Costas, Bíceps
  const pullExercises = [
    ...exercises.filter(e => e.grupo === 'Costas').slice(0, 4),
    ...exercises.filter(e => e.grupo === 'Braços' && e.subGrupo === 'Bíceps').slice(0, 2),
  ];
  
  // Legs: Pernas, Core
  const legExercises = [
    ...exercises.filter(e => e.grupo === 'Pernas').slice(0, 5),
    ...exercises.filter(e => e.grupo === 'Core').slice(0, 2),
  ];
  
  return [
    {
      name: 'Push - Peito, Ombros, Tríceps',
      muscle_group: 'Push',
      exercises: pushExercises.map(e => ({
        name: e.exercicio,
        sets: '3-5',
        reps: '6-12',
        rest: '90-120s',
      })),
    },
    {
      name: 'Pull - Costas e Bíceps',
      muscle_group: 'Pull',
      exercises: pullExercises.map(e => ({
        name: e.exercicio,
        sets: '3-5',
        reps: '6-12',
        rest: '90-120s',
      })),
    },
    {
      name: 'Legs - Pernas e Core',
      muscle_group: 'Legs',
      exercises: legExercises.map(e => ({
        name: e.exercicio,
        sets: '3-5',
        reps: '6-12',
        rest: '90-120s',
      })),
    },
  ];
};

// Treino Personalizado baseado em porcentagens
const generateCustomTemplate = (
  exercises: Exercise[],
  focus: MuscleGroupFocus
): WorkoutTemplate[] => {
  const total = Object.values(focus).reduce((sum, val) => sum + val, 0);
  if (total !== 100) {
    throw new Error('As porcentagens devem somar 100%');
  }
  
  const workouts: WorkoutTemplate[] = [];
  const exercisesPerGroup: { [key: string]: Exercise[] } = {};
  
  // Agrupar exercícios por grupo muscular
  Object.keys(MUSCLE_GROUPS).forEach(group => {
    exercisesPerGroup[group] = exercises.filter(e => e.grupo === group);
  });
  
  // Calcular quantos exercícios por grupo baseado na porcentagem
  const totalExercises = 12; // Total de exercícios por treino
  const exercisesCount: { [key: string]: number } = {};
  
  Object.keys(focus).forEach(group => {
    if (focus[group] > 0) {
      exercisesCount[group] = Math.max(1, Math.round((focus[group] / 100) * totalExercises));
    }
  });
  
  // Criar treinos distribuindo os exercícios
  const allExercises: Array<{ name: string; sets: string; reps: string; rest: string; group: string }> = [];
  
  Object.keys(exercisesCount).forEach(group => {
    const count = exercisesCount[group];
    const groupExercises = exercisesPerGroup[group] || [];
    const selected = groupExercises.slice(0, count);
    
    selected.forEach(ex => {
      allExercises.push({
        name: ex.exercicio,
        sets: '3-4',
        reps: '8-12',
        rest: '60-90s',
        group: group,
      });
    });
  });
  
  // Dividir em 3 treinos (A, B, C)
  const workoutsCount = 3;
  const exercisesPerWorkout = Math.ceil(allExercises.length / workoutsCount);
  
  for (let i = 0; i < workoutsCount; i++) {
    const start = i * exercisesPerWorkout;
    const end = start + exercisesPerWorkout;
    const workoutExercises = allExercises.slice(start, end);
    
    if (workoutExercises.length > 0) {
      workouts.push({
        name: `Treino Personalizado ${String.fromCharCode(65 + i)}`,
        muscle_group: workoutExercises.map(e => e.group).join('/'),
        exercises: workoutExercises.map(e => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          rest: e.rest,
        })),
      });
    }
  }
  
  return workouts;
};

export const generateWorkouts = async (
  type: 'abc' | 'beginner' | 'intermediate' | 'advanced' | 'custom',
  userLimitations: UserLimitations,
  limitations: Limitation[],
  customFocus?: MuscleGroupFocus
): Promise<WorkoutTemplate[]> => {
  const { loadExercises } = await import('./exerciseService');
  
  const allExercises = await loadExercises();
  const filtered = filterExercisesByLimitations(allExercises, userLimitations, limitations);
  
  switch (type) {
    case 'abc':
      return generateABCTemplate(filtered);
    case 'beginner':
      return generateBeginnerTemplate(filtered);
    case 'intermediate':
      return generateIntermediateTemplate(filtered);
    case 'advanced':
      return generateAdvancedTemplate(filtered);
    case 'custom':
      if (!customFocus) throw new Error('Foco personalizado é obrigatório');
      return generateCustomTemplate(filtered, customFocus);
    default:
      return [];
  }
};

