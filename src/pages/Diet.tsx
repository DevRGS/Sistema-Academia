import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import MealCard from '@/components/diet/MealCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Utensils } from 'lucide-react';

export type MealType = 'cafe_da_manha' | 'lanche_da_manha' | 'almoco' | 'lanche_da_tarde' | 'jantar' | 'ceia';

export const mealTypeMap: Record<MealType, string> = {
  cafe_da_manha: 'Café da Manhã',
  lanche_da_manha: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche_da_tarde: 'Lanche da Tarde',
  jantar: 'Jantar',
  ceia: 'Ceia',
};

export type DietPlan = {
  id: number;
  meal: MealType;
  description: string;
  scheduled_time: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

export type DietLog = {
  id: number;
  diet_plan_id: number;
  logged_at: string;
};

const mealOrder: Record<MealType, number> = {
  cafe_da_manha: 1,
  lanche_da_manha: 2,
  almoco: 3,
  lanche_da_tarde: 4,
  jantar: 5,
  ceia: 6,
};

const DietPage = () => {
  const { user } = useSession();
  const [dietPlan, setDietPlan] = useState<DietPlan[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [planResponse, logsResponse] = await Promise.all([
      supabase.from('diet_plans').select('*').eq('user_id', user.id),
      supabase.from('diet_logs').select('*').eq('user_id', user.id)
        .gte('logged_at', today.toISOString())
        .lt('logged_at', tomorrow.toISOString()),
    ]);

    if (planResponse.error || logsResponse.error) {
      console.error('Error fetching diet data:', planResponse.error || logsResponse.error);
    } else {
      const sortedPlan = (planResponse.data || []).sort((a, b) => mealOrder[a.meal] - mealOrder[b.meal]);
      setDietPlan(sortedPlan as DietPlan[]);
      setDietLogs((logsResponse.data || []) as DietLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleMealLogged = () => {
    // Refetch logs to update the UI
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (dietPlan.length === 0) {
    return (
       <Alert>
        <Utensils className="h-4 w-4" />
        <AlertTitle>Nenhum plano de dieta encontrado!</AlertTitle>
        <AlertDescription>
          Seu plano de dieta ainda não foi cadastrado. Entre em contato com seu instrutor.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Minha Dieta</h1>
      <div className="space-y-4">
        {dietPlan.map((meal) => {
          const isLogged = dietLogs.some(log => log.diet_plan_id === meal.id);
          return <MealCard key={meal.id} meal={meal} isLogged={isLogged} onMealLogged={handleMealLogged} />;
        })}
      </div>
    </div>
  );
};

export default DietPage;