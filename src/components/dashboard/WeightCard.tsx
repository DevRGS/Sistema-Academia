import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Weight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '../ui/skeleton';

const WeightCard = () => {
  const { user, loading: sessionLoading } = useSession();
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [previousWeight, setPreviousWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestWeight = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('weight_history')
        .select('weight_kg, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2); // Get the two most recent entries

      if (error) {
        console.error('Error fetching weight history:', error);
        setLatestWeight(null);
        setPreviousWeight(null);
      } else if (data && data.length > 0) {
        setLatestWeight(data[0].weight_kg);
        if (data.length > 1) {
          setPreviousWeight(data[1].weight_kg);
        } else {
          setPreviousWeight(null);
        }
      } else {
        setLatestWeight(null);
        setPreviousWeight(null);
      }
      setLoading(false);
    };

    if (!sessionLoading) {
      fetchLatestWeight();
    }
  }, [user, sessionLoading]);

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