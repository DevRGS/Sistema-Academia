/**
 * Serviço de Gerenciamento de Expiração de Treinos
 * 
 * Este serviço implementa a lógica de alteração automática de treinos baseada
 * EXCLUSIVAMENTE em tempo de adaptação, não em quantidade de treinos executados.
 * 
 * REGRAS DE NEGÓCIO:
 * - Um treino é considerado "ativo" por um período padrão de 45 dias (configurável)
 * - A troca NÃO é baseada na quantidade de treinos executados
 * - Dias sem treinar NÃO postergam a troca
 * - A decisão é EXCLUSIVAMENTE temporal (start_date + adaptation_period = expiration_date)
 */

import { generateWorkouts } from './workoutGenerator';
import { loadLimitations, type UserLimitations } from './exerciseService';

// Período padrão de adaptação em dias (45 dias)
export const DEFAULT_ADAPTATION_PERIOD_DAYS = 45;

// Estados possíveis de um treino
export type WorkoutStatus = 'ativo' | 'expirado' | 'substituído';

// Tipo para um plano de treino com informações de expiração
export type WorkoutPlan = {
  id: string | number;
  user_id: string;
  name: string;
  muscle_group: string;
  exercises: string | any[]; // JSON string ou array
  created_at: string;
  start_date?: string;
  expiration_date?: string;
  status?: WorkoutStatus;
  adaptation_period_days?: number;
};

/**
 * Calcula a data de expiração baseada na data de início e período de adaptação
 * 
 * @param startDate Data de início do treino (ISO string)
 * @param adaptationPeriodDays Período de adaptação em dias (padrão: 45)
 * @returns Data de expiração (ISO string)
 */
export const calculateExpirationDate = (
  startDate: string,
  adaptationPeriodDays: number = DEFAULT_ADAPTATION_PERIOD_DAYS
): string => {
  const start = new Date(startDate);
  const expiration = new Date(start);
  expiration.setDate(expiration.getDate() + adaptationPeriodDays);
  return expiration.toISOString();
};

/**
 * Verifica se um treino está expirado baseado na data atual
 * 
 * IMPORTANTE: Esta verificação é EXCLUSIVAMENTE temporal.
 * Não considera quantidade de treinos executados ou frequência de treino.
 * 
 * @param workout Treino a ser verificado
 * @returns true se o treino está expirado, false caso contrário
 */
export const isWorkoutExpired = (workout: WorkoutPlan): boolean => {
  // Se não tem data de expiração, considerar como não expirado (treino antigo)
  if (!workout.expiration_date) {
    return false;
  }

  const expirationDate = new Date(workout.expiration_date);
  const now = new Date();
  
  // Treino expirado se a data atual é maior ou igual à data de expiração
  return now >= expirationDate;
};

/**
 * Verifica se um treino está ativo
 * 
 * @param workout Treino a ser verificado
 * @returns true se o treino está ativo, false caso contrário
 */
export const isWorkoutActive = (workout: WorkoutPlan): boolean => {
  return workout.status === 'ativo' && !isWorkoutExpired(workout);
};

/**
 * Encontra o treino ativo de um usuário
 * 
 * @param workouts Lista de treinos do usuário
 * @returns Treino ativo ou null se não houver
 */
export const findActiveWorkout = (workouts: WorkoutPlan[]): WorkoutPlan | null => {
  // Buscar treino com status 'ativo' que não está expirado
  const activeWorkout = workouts.find(
    workout => workout.status === 'ativo' && !isWorkoutExpired(workout)
  );

  return activeWorkout || null;
};

/**
 * Gera um novo treino automaticamente quando o atual expira
 * 
 * Esta função:
 * 1. Marca o treino atual como "expirado"
 * 2. Gera um novo treino baseado no perfil do usuário
 * 3. Define start_date e expiration_date do novo treino
 * 4. Marca o treino antigo como "substituído"
 * 
 * @param userId ID do usuário
 * @param userLimitations Limitações físicas do usuário
 * @param adaptationPeriodDays Período de adaptação em dias (padrão: 45)
 * @param workoutType Tipo de treino a gerar (padrão: 'intermediate')
 * @returns Lista de treinos gerados
 */
export const generateNewWorkoutAfterExpiration = async (
  userId: string,
  userLimitations: UserLimitations,
  adaptationPeriodDays: number = DEFAULT_ADAPTATION_PERIOD_DAYS,
  workoutType: 'abc' | 'beginner' | 'intermediate' | 'advanced' | 'custom' = 'intermediate'
): Promise<any[]> => {
  // Carregar limitações do sistema
  const limitations = await loadLimitations();

  // Gerar novos treinos baseados no tipo e limitações
  const newWorkouts = await generateWorkouts(
    workoutType,
    userLimitations,
    limitations
  );

  // Data de início do novo treino (hoje)
  const startDate = new Date().toISOString();
  const expirationDate = calculateExpirationDate(startDate, adaptationPeriodDays);

  // Preparar treinos com informações de expiração
  const workoutsWithExpiration = newWorkouts.map(workout => ({
    user_id: userId,
    name: workout.name,
    muscle_group: workout.muscle_group,
    exercises: JSON.stringify(workout.exercises),
    created_at: startDate,
    start_date: startDate,
    expiration_date: expirationDate,
    status: 'ativo' as WorkoutStatus,
    adaptation_period_days: adaptationPeriodDays,
  }));

  return workoutsWithExpiration;
};

/**
 * Verifica e processa a expiração de treinos de um usuário
 * 
 * Esta é a função principal que deve ser chamada sempre que o usuário acessa o app.
 * 
 * COMPORTAMENTO:
 * 1. Busca treinos ativos do usuário
 * 2. Verifica se algum está expirado (baseado EXCLUSIVAMENTE em tempo)
 * 3. Se expirado:
 *    - Marca como "expirado"
 *    - Gera novo treino automaticamente
 *    - Marca treino antigo como "substituído"
 * 
 * IMPORTANTE:
 * - A verificação é EXCLUSIVAMENTE temporal
 * - Não considera quantidade de treinos executados
 * - Dias sem treinar NÃO postergam a troca
 * 
 * @param userId ID do usuário
 * @param workouts Lista de treinos do usuário
 * @param userLimitations Limitações físicas do usuário
 * @param select Função para buscar dados do banco
 * @param update Função para atualizar dados no banco
 * @param insert Função para inserir dados no banco
 * @param adaptationPeriodDays Período de adaptação em dias (padrão: 45)
 * @returns true se um novo treino foi gerado, false caso contrário
 */
export const checkAndProcessWorkoutExpiration = async (
  userId: string,
  workouts: WorkoutPlan[],
  userLimitations: UserLimitations,
  select: any,
  update: any,
  insert: any,
  adaptationPeriodDays: number = DEFAULT_ADAPTATION_PERIOD_DAYS
): Promise<boolean> => {
  // Encontrar treino ativo
  const activeWorkout = findActiveWorkout(workouts);

  // Se não há treino ativo, não há nada para verificar
  if (!activeWorkout) {
    return false;
  }

  // Verificar se o treino está expirado (EXCLUSIVAMENTE por tempo)
  if (!isWorkoutExpired(activeWorkout)) {
    return false;
  }

  console.log('WorkoutExpirationService: Treino expirado detectado', {
    workoutId: activeWorkout.id,
    workoutName: activeWorkout.name,
    expirationDate: activeWorkout.expiration_date,
    currentDate: new Date().toISOString(),
  });

  try {
    // 1. Gerar novo treino automaticamente ANTES de marcar como expirado
    // Isso garante que o usuário sempre tenha um treino ativo
    const newWorkouts = await generateNewWorkoutAfterExpiration(
      userId,
      userLimitations,
      adaptationPeriodDays,
      'intermediate' // Pode ser configurável no futuro
    );

    // 2. Inserir novos treinos
    for (const workout of newWorkouts) {
      await insert('workouts', workout);
    }

    console.log('WorkoutExpirationService: Novo treino gerado automaticamente', {
      count: newWorkouts.length,
      startDate: newWorkouts[0]?.start_date,
      expirationDate: newWorkouts[0]?.expiration_date,
    });

    // 3. Marcar treino antigo como "substituído" (para histórico)
    // Usar apenas os campos necessários para o update
    await update(
      'workouts',
      {
        status: 'substituído',
      },
      {
        column: 'id',
        value: activeWorkout.id,
      }
    );

    return true;
  } catch (error) {
    console.error('WorkoutExpirationService: Erro ao processar expiração de treino', error);
    throw error;
  }
};

/**
 * Inicializa um treino com datas de início e expiração
 * 
 * Útil para quando um treino é criado manualmente ou no onboarding
 * 
 * @param workout Treino a ser inicializado
 * @param adaptationPeriodDays Período de adaptação em dias (padrão: 45)
 * @returns Treino com start_date, expiration_date e status definidos
 */
export const initializeWorkoutWithDates = (
  workout: Partial<WorkoutPlan>,
  adaptationPeriodDays: number = DEFAULT_ADAPTATION_PERIOD_DAYS
): Partial<WorkoutPlan> => {
  const startDate = new Date().toISOString();
  const expirationDate = calculateExpirationDate(startDate, adaptationPeriodDays);

  return {
    ...workout,
    start_date: startDate,
    expiration_date: expirationDate,
    status: 'ativo' as WorkoutStatus,
    adaptation_period_days: adaptationPeriodDays,
  };
};

