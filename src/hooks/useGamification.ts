import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import {
  getXp,
  getProgressoNivel,
  getNomeNivel,
  getFraseMotivacional,
  type Genero,
  type ProgressoNivel,
} from '@/utils/gamification';

type WorkoutLogRow = { log_date?: string; workout_id?: string | number };
type DietLogRow = { id: string };

export type GamificationState = {
  totalTreinos: number;
  totalDietas: number;
  xp: number;
  nivel: number;
  nomeNivel: string;
  progresso: ProgressoNivel;
  fraseMotivacional: string;
  loading: boolean;
};

/**
 * Hook de gamificação: busca treinos e dietas registrados e calcula XP, nível e progresso.
 * Reutilizável e preparado para futuras conquistas (badges).
 */
export function useGamification(): GamificationState {
  const { user, profile } = useSession();
  const { select, initialized, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [totalTreinos, setTotalTreinos] = useState(0);
  const [totalDietas, setTotalDietas] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!initialized || !user) {
        setLoading(false);
        return;
      }
      const isViewingShared = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingShared && profile?.id) ? String(profile.id) : String(user.id);

      setLoading(true);
      try {
        const [workoutLogs, dietLogs] = await Promise.all([
          select<WorkoutLogRow>('workout_logs', { eq: { column: 'user_id', value: userId } }),
          select<DietLogRow>('diet_logs', { eq: { column: 'user_id', value: userId } }),
        ]);

        const sessions = new Set<string>();
        (workoutLogs || []).forEach((row) => {
          const key = `${row.log_date ?? ''}_${row.workout_id ?? ''}`;
          if (key !== '_') sessions.add(key);
        });
        setTotalTreinos(sessions.size);
        setTotalDietas((dietLogs || []).length);
      } catch (err) {
        console.error('useGamification: erro ao carregar dados', err);
        setTotalTreinos(0);
        setTotalDietas(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [initialized, user, profile?.id, spreadsheetId, originalSpreadsheetId, select]);

  const xp = getXp(totalTreinos, totalDietas);
  const progresso = getProgressoNivel(xp);
  const genero = (profile?.sex as Genero) ?? 'Masculino';
  const nomeNivel = getNomeNivel(progresso.nivel, genero);
  const fraseMotivacional = getFraseMotivacional(xp, progresso.nivel);

  return {
    totalTreinos,
    totalDietas,
    xp,
    nivel: progresso.nivel,
    nomeNivel,
    progresso,
    fraseMotivacional,
    loading,
  };
}
