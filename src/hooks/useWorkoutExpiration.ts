import { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import {
  checkAndProcessWorkoutExpiration,
  type WorkoutPlan,
  DEFAULT_ADAPTATION_PERIOD_DAYS,
} from '@/utils/workoutExpirationService';
import { showSuccess, showError } from '@/utils/toast';

/**
 * Hook para gerenciar verificação automática de expiração de treinos
 * 
 * Este hook verifica automaticamente se o treino do usuário está expirado
 * sempre que o usuário acessa o app e o banco está inicializado.
 * 
 * A verificação é EXCLUSIVAMENTE temporal (não baseada em quantidade de treinos).
 */
export const useWorkoutExpiration = () => {
  const { user, profile } = useSession();
  const { select, update, insert, initialized, loading } = useGoogleSheetsDB();
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    const checkExpiration = async () => {
      // Aguardar até que tudo esteja pronto
      if (!initialized || !user || loading || checking || hasChecked) {
        return;
      }

      // Verificar se o usuário tem perfil completo (necessário para gerar treino)
      if (!profile?.height_cm || !profile?.weight_kg || !profile?.sex || !profile?.age || !profile?.routine) {
        console.log('useWorkoutExpiration: Perfil incompleto, pulando verificação');
        setHasChecked(true);
        return;
      }

      setChecking(true);
      console.log('useWorkoutExpiration: Verificando expiração de treinos...');

      try {
        // Buscar treinos do usuário
        const options: any = { 
          eq: { column: 'user_id', value: user.id },
          order: { column: 'created_at', ascending: false }
        };
        const workouts = await select<WorkoutPlan>('workouts', options);

        // Carregar limitações do usuário
        let userLimitations: { [key: string]: boolean } = {};
        if (profile.limitations) {
          try {
            userLimitations = typeof profile.limitations === 'string'
              ? JSON.parse(profile.limitations)
              : profile.limitations;
          } catch {
            userLimitations = {};
          }
        }

        // Verificar e processar expiração
        const newWorkoutGenerated = await checkAndProcessWorkoutExpiration(
          user.id,
          workouts,
          userLimitations,
          select,
          update,
          insert,
          DEFAULT_ADAPTATION_PERIOD_DAYS
        );

        if (newWorkoutGenerated) {
          console.log('useWorkoutExpiration: Novo treino gerado automaticamente');
          showSuccess('Seu treino foi atualizado automaticamente após o período de adaptação!');
        }
      } catch (error) {
        console.error('useWorkoutExpiration: Erro ao verificar expiração', error);
        // Não mostrar erro ao usuário para não interromper o fluxo
      } finally {
        setChecking(false);
        setHasChecked(true);
      }
    };

    checkExpiration();
  }, [initialized, user, profile, loading, checking, hasChecked, select, update, insert]);

  return {
    checking,
    hasChecked,
  };
};

