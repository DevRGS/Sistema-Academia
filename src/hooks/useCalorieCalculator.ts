import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { getGastoTotalDiario, type GastoTotalDiarioResult, type WorkoutSessionForEAT } from '@/utils/calorieCalculator';

type WorkoutLogRow = {
  log_date?: string;
  workout_id?: string | number;
  workout_duration_seconds?: number | string;
  intensity?: string | null;
};

/**
 * Hook para cálculo de gasto calórico diário (BMR + NEAT + EAT).
 * Busca treinos do dia e usa perfil para BMR e locomoção.
 */
export function useCalorieCalculator(): {
  result: GastoTotalDiarioResult | null;
  loading: boolean;
} {
  const { user, profile } = useSession();
  const { select, initialized, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [sessionsToday, setSessionsToday] = useState<WorkoutSessionForEAT[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchTodaySessions = async () => {
    if (!initialized || !user) {
      setLoading(false);
      return;
    }
    const isViewingShared = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
    const userId = (isViewingShared && profile?.id) ? String(profile.id) : String(user.id);
    const today = new Date().toISOString().split('T')[0];

    setLoading(true);
    try {
      const rows = await select<WorkoutLogRow>('workout_logs', {
        eq: { column: 'user_id', value: userId },
      });
      const todayRows = (rows || []).filter((r) => r.log_date === today);
      const bySession = new Map<string, WorkoutSessionForEAT>();
      todayRows.forEach((r) => {
        const key = `${r.log_date}_${r.workout_id ?? ''}`;
        if (!bySession.has(key)) {
          bySession.set(key, {
            workout_duration_seconds: r.workout_duration_seconds,
            intensity: r.intensity ?? undefined,
          });
        }
      });
      setSessionsToday(Array.from(bySession.values()));
    } catch (err) {
      console.error('useCalorieCalculator: erro ao carregar treinos do dia', err);
      setSessionsToday([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySessions();
  }, [initialized, user, profile?.id, spreadsheetId, originalSpreadsheetId, select, refreshTrigger]);

  useEffect(() => {
    const onRefresh = () => setRefreshTrigger((t) => t + 1);
    window.addEventListener('workoutLogged', onRefresh);
    window.addEventListener('profileUpdated', onRefresh);
    return () => {
      window.removeEventListener('workoutLogged', onRefresh);
      window.removeEventListener('profileUpdated', onRefresh);
    };
  }, []);

  const result = profile
    ? getGastoTotalDiario(
        {
          sex: profile.sex,
          weight_kg: profile.weight_kg,
          height_cm: profile.height_cm,
          age: profile.age,
          locomotion_type: profile.locomotion_type,
          locomotion_time_minutes: profile.locomotion_time_minutes,
          locomotion_days: profile.locomotion_days,
        },
        sessionsToday
      )
    : null;

  return { result, loading };
}
