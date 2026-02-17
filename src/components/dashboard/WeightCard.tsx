import { useState, useEffect, useRef } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Weight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Skeleton } from '../ui/skeleton';
import { useRetry } from '@/hooks/useRetry';

const WeightCard = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [previousWeight, setPreviousWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { retry } = useRetry();
  const fetchAttemptsRef = useRef(0);
  const MAX_FETCH_ATTEMPTS = 3;

  useEffect(() => {
    const fetchLatestWeight = async () => {
      // Aguardar até que tudo esteja pronto
      if (!user || !initialized || sessionLoading || dbLoading) {
        if (!sessionLoading && !dbLoading && !initialized) {
          // Se não está carregando mas também não está inicializado, parar loading
          setLoading(false);
        }
        return;
      }

      // Limitar tentativas para evitar requisições infinitas
      if (fetchAttemptsRef.current >= MAX_FETCH_ATTEMPTS) {
        console.warn('WeightCard: Máximo de tentativas atingido, usando fallback');
        setLoading(false);
        // Usar peso do perfil como fallback
        if (profile?.weight_kg) {
          const profileWeight = typeof profile.weight_kg === 'string' 
            ? Number(profile.weight_kg) 
            : profile.weight_kg;
          if (!isNaN(profileWeight)) {
            setLatestWeight(profileWeight);
          }
        }
        return;
      }

      setLoading(true);
      fetchAttemptsRef.current++;

      try {
        // If viewing a shared spreadsheet (not own), use profile.id (which will be the student's ID)
        // Otherwise, use user.id (the full Google ID) to avoid truncation issues
        const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
        const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
        
        const result = await retry(async () => {
          // First, try to get from weight_history (most recent)
          const data = await select<{ weight_kg: number; created_at: string }>('weight_history', {
            eq: { column: 'user_id', value: userId },
            order: { column: 'created_at', ascending: false },
          });
          return data;
        }, {
          maxAttempts: 2,
          delay: 500,
        });

        if (result && result.length > 0) {
          // Use weight from history (most recent)
          setLatestWeight(result[0].weight_kg);
          if (result.length > 1) {
            setPreviousWeight(result[1].weight_kg);
          } else {
            setPreviousWeight(null);
          }
        } else {
          // If no history, try to get weight from profile
          if (profile?.weight_kg) {
            const profileWeight = typeof profile.weight_kg === 'string' 
              ? Number(profile.weight_kg) 
              : profile.weight_kg;
            if (!isNaN(profileWeight)) {
              setLatestWeight(profileWeight);
            } else {
              setLatestWeight(null);
            }
          } else {
            setLatestWeight(null);
          }
          setPreviousWeight(null);
        }
      } catch (error) {
        console.error('Error fetching weight history:', error);
        // Fallback to profile weight if available
        if (profile?.weight_kg) {
          const profileWeight = typeof profile.weight_kg === 'string' 
            ? Number(profile.weight_kg) 
            : profile.weight_kg;
          if (!isNaN(profileWeight)) {
            setLatestWeight(profileWeight);
          } else {
            setLatestWeight(null);
          }
        } else {
          setLatestWeight(null);
        }
        setPreviousWeight(null);
      } finally {
        setLoading(false);
        // Reset tentativas após sucesso ou falha final
        fetchAttemptsRef.current = 0;
      }
    };

    if (!sessionLoading && !dbLoading && initialized) {
      fetchLatestWeight();
    }

    // Listener para atualizar quando peso for adicionado ou perfil atualizado
    const handleProfileUpdate = () => {
      if (initialized && user && !sessionLoading && !dbLoading) {
        // Reset tentativas ao receber evento de atualização
        fetchAttemptsRef.current = 0;
        fetchLatestWeight();
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('weightAdded', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('weightAdded', handleProfileUpdate);
    };
  }, [user, profile, sessionLoading, dbLoading, initialized, spreadsheetId, originalSpreadsheetId, select, retry]);

  if (loading) {
    return <Skeleton className="h-[120px] w-full" />;
  }

  const weightDifference = latestWeight !== null && previousWeight !== null
    ? latestWeight - previousWeight
    : null;

  return (
    <NavLink to="/weight-tracking" className="no-underline">
      <Card className="card-hover h-full animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
          <Weight className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          {latestWeight !== null ? (
            <>
              <div className="text-2xl font-bold text-primary">{latestWeight} kg</div>
              {weightDifference !== null && (
                <p className={`text-xs font-medium transition-colors ${weightDifference < 0 ? 'text-green-500' : weightDifference > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {weightDifference > 0 ? '+' : ''}{weightDifference.toFixed(1)} kg desde a última pesagem
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-lg font-semibold">Nenhum registro</div>
              <p className="text-xs text-muted-foreground">
                Clique para adicionar seu primeiro peso.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </NavLink>
  );
};

export default WeightCard;