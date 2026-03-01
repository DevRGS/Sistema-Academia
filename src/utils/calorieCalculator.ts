/**
 * Cálculo de Gasto Calórico Diário: BMR + NEAT (Locomoção) + EAT (Treino).
 * Modelo técnico com intensidade para estimativa mais próxima da realidade fisiológica.
 */

/** Perfil mínimo para BMR (peso em kg, altura em cm, idade em anos). */
export type ProfileForBMR = {
  sex?: string;
  weight_kg?: number | string;
  height_cm?: number | string;
  age?: number | string;
};

/** Perfil para NEAT (locomoção semanal). */
export type ProfileForNEAT = ProfileForBMR & {
  locomotion_type?: string | null;
  locomotion_time_minutes?: number | string | null;
  locomotion_days?: string[] | string | null;
};

/** Sessão de treino (uma entrada por sessão, com duração e intensidade). */
export type WorkoutSessionForEAT = {
  workout_duration_seconds?: number | string | null;
  intensity?: string | null;
};

/** MET padrão quando intensidade não está registrada (fallback seguro). */
const MET_TREINO_PADRAO = 5;

/** Duração padrão do treino em minutos quando não informada. */
const DURACAO_TREINO_PADRAO_MIN = 45;

/**
 * Tabela de MET médio por tipo de atividade (locomoção).
 * Caminhada leve/moderada, corrida, bike.
 */
const MET_LOCOMOCAO: Record<string, number> = {
  'Caminha': 3.5,
  'Caminhada leve': 3.5,
  'Caminhada moderada': 4.3,
  'Corre': 8,
  'Corrida leve': 8,
  'Bicicleta': 6,
  'Bike leve': 6,
  'Bike moderada': 8,
};

/**
 * MET por intensidade do treino (EAT).
 */
const MET_TREINO: Record<string, number> = {
  'leve': 4,
  'moderado': 6,
  'intenso': 8,
};

/**
 * BMR pela equação de Harris-Benedict.
 * Base mínima do gasto diário; sempre que possível deve existir.
 */
export function getBMR(profile: ProfileForBMR): number | null {
  const weight = toNumber(profile.weight_kg);
  const height = toNumber(profile.height_cm);
  const age = toNumber(profile.age);
  if (!weight || !height || !age || weight <= 0 || height <= 0 || age <= 0) return null;
  if (profile.sex === 'Masculino') {
    return 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  }
  if (profile.sex === 'Feminino') {
    return 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;
  }
  return null;
}

/**
 * Retorna o MET para um tipo de atividade (locomoção).
 * Fallback: 0 se atividade não mapeada (não retorna negativo).
 */
export function getMETByActivity(activityType: string): number {
  const key = activityType?.trim() || '';
  const met = MET_LOCOMOCAO[key];
  return met != null && met >= 0 ? met : 0;
}

/**
 * MET do treino por intensidade (leve, moderado, intenso).
 * Fallback: MET_TREINO_PADRAO (5) quando não registrado.
 */
export function getMETByIntensity(intensity?: string | null): number {
  const key = (intensity ?? '').toLowerCase().trim();
  return MET_TREINO[key] ?? MET_TREINO_PADRAO;
}

/**
 * Calorias da locomoção (NEAT): média diária a partir do padrão semanal.
 * Fórmula: MET × Peso(kg) × Tempo(horas) por sessão; média = (sessões × calorias_sessão) / 7.
 * Sem atividade no dia (ou sem dados) → 0. Nunca retorna negativo.
 */
export function getCaloriasLocomocao(profile: ProfileForNEAT): number {
  const weight = toNumber(profile.weight_kg);
  const met = getMETByActivity(profile.locomotion_type ?? '');
  if (!weight || weight <= 0 || met <= 0) return 0;

  let timeMinutes = toNumber(profile.locomotion_time_minutes);
  if (timeMinutes == null || timeMinutes <= 0) return 0;

  let days: string[] = [];
  const raw = profile.locomotion_days;
  if (Array.isArray(raw)) days = raw;
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      days = Array.isArray(parsed) ? parsed : [];
    } catch {
      days = [];
    }
  }
  if (days.length === 0) return 0;

  const timeHours = timeMinutes / 60;
  const caloriasPorSessao = met * weight * timeHours;
  const mediaDiaria = (caloriasPorSessao * days.length) / 7;
  return Math.max(0, Math.round(mediaDiaria * 10) / 10);
}

/**
 * Calorias do treino (EAT) para uma lista de sessões.
 * Fórmula por sessão: MET × Peso(kg) × Tempo(horas).
 * Fallbacks: sem intensidade → MET 5; sem duração → 45 min. Nunca retorna negativo.
 */
export function getCaloriasTreino(
  sessions: WorkoutSessionForEAT[],
  weightKg: number
): number {
  if (!weightKg || weightKg <= 0) return 0;
  let total = 0;
  for (const s of sessions) {
    const durationSeconds = toNumber(s.workout_duration_seconds);
    const durationMinutes = durationSeconds != null && durationSeconds > 0
      ? durationSeconds / 60
      : DURACAO_TREINO_PADRAO_MIN;
    const durationHours = durationMinutes / 60;
    const met = getMETByIntensity(s.intensity);
    total += met * weightKg * durationHours;
  }
  return Math.max(0, Math.round(total * 10) / 10);
}

export type GastoTotalDiarioResult = {
  bmr: number;
  caloriasLocomocao: number;
  caloriasTreino: number;
  gastoTotal: number;
  breakdown: {
    basal: number;
    locomocao: number;
    treino: number;
  };
};

/**
 * Gasto total diário para uma data: BMR + NEAT + EAT.
 * BMR é a base; se faltar perfil, BMR = 0 (e gasto total pode ser só NEAT + EAT).
 * Nunca retorna valores negativos.
 */
export function getGastoTotalDiario(
  profile: ProfileForNEAT,
  treinosDoDia: WorkoutSessionForEAT[]
): GastoTotalDiarioResult {
  const weight = toNumber(profile.weight_kg) ?? 0;
  const bmr = getBMR(profile) ?? 0;
  const caloriasLocomocao = getCaloriasLocomocao(profile);
  const caloriasTreino = getCaloriasTreino(treinosDoDia, weight);

  const basal = Math.max(0, bmr);
  const locomocao = Math.max(0, caloriasLocomocao);
  const treino = Math.max(0, caloriasTreino);
  const gastoTotal = Math.max(0, basal + locomocao + treino);

  return {
    bmr: basal,
    caloriasLocomocao: locomocao,
    caloriasTreino: treino,
    gastoTotal,
    breakdown: { basal, locomocao, treino },
  };
}

function toNumber(v: number | string | undefined | null): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? null : n;
}
