import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Weight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Skeleton } from '../ui/skeleton';

const WeightCard = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [previousWeight, setPreviousWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestWeight = async () => {
      if (!user || !initialized) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // First, try to get weight from profile
        if (profile?.weight_kg) {
          const profileWeight = typeof profile.weight_kg === 'string' 
            ? Number(profile.weight_kg) 
            : profile.weight_kg;
          if (!isNaN(profileWeight)) {
            setLatestWeight(profileWeight);
          }
        }

        // Then, try to get from weight_history for comparison
        // If viewing a shared spreadsheet (not own), use profile.id (which will be the student's ID)
        // Otherwise, use user.id (the full Google ID) to avoid truncation issues
        const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
        const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
        const data = await select<{ weight_kg: number; created_at: string }>('weight_history', {
          eq: { column: 'user_id', value: userId },
          order: { column: 'created_at', ascending: false },
        });

        if (data && data.length > 0) {
          // Use weight from history if available (more recent), otherwise use profile weight
          if (!latestWeight) {
            setLatestWeight(data[0].weight_kg);
          }
          if (data.length > 1) {
            setPreviousWeight(data[1].weight_kg);
          } else {
            setPreviousWeight(null);
          }
        } else {
          // If no history and no profile weight, set to null
          if (!profile?.weight_kg) {
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
          }
        } else {
          setLatestWeight(null);
        }
        setPreviousWeight(null);
      } finally {
        setLoading(false);
      }
    };

    if (!sessionLoading && !dbLoading && initialized) {
      fetchLatestWeight();
    }
  }, [user, profile, sessionLoading, dbLoading, initialized, spreadsheetId]);

  if (loading) {
    return <Skeleton className="h-[120px] w-full" />;
  }

  const weightDifference = latestWeight !== null && previousWeight !== null
    ? latestWeight - previousWeight
    : null;

  return (
    <NavLink to="/weight-tracking" className="no-underline">
      <Card className="hover:bg-muted/80 transition-colors h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
          <Weight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {latestWeight !== null ? (
            <>
              <div className="text-2xl font-bold">{latestWeight} kg</div>
              {weightDifference !== null && (
                <p className={`text-xs ${weightDifference < 0 ? 'text-green-500' : weightDifference > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
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