import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import MealCard from '@/components/diet/MealCard';
import DietTotalsCard from '@/components/diet/DietTotalsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Utensils } from 'lucide-react';

export type MealType = 'Café da Manhã' | 'Lanche da Manhã' | 'Almoço' | 'Lanche da Tarde' | 'Jantar' | 'Ceia';

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
  'Café da Manhã': 1,
  'Lanche da Manhã': 2,
  'Almoço': 3,
  'Lanche da Tarde': 4,
  'Jantar': 5,
  'Ceia': 6,
};

const DietPage = () => {
  const { user } = useSession();
  const [dietPlan, setDietPlan] = useState<DietPlan[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

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
    fetchData();
  };

  const { consumedTotals, targetTotals } = useMemo(() => {
    const calculateTotals = (meals: DietPlan[]) => {
      return meals.reduce(
        (acc, meal) => {
          acc.calories += meal.calories || 0;
          acc.protein += meal.protein_g || 0;
          acc.carbs += meal.carbs_g || 0;
          acc.fat += meal.fat_g || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
    };

    const targetTotals = calculateTotals(dietPlan);
    const loggedMealIds = new Set(dietLogs.map(log => log.diet_plan_id));
    const consumedMeals = dietPlan.filter(meal => loggedMealIds.has(meal.id));
    const consumedTotals = calculateTotals(consumedMeals);

    return { consumedTotals, targetTotals };
  }, [dietPlan, dietLogs]);

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
      <div className="space-y-4 pb-32">
        {dietPlan.map((meal) => {
          const isLogged = dietLogs.some(log => log.diet_plan_id === meal.id);
          return <MealCard key={meal.id} meal={meal} isLogged={isLogged} onMealLogged={handleMealLogged} />;
        })}
      </div>
      <DietTotalsCard consumed={consumedTotals} target={targetTotals} />
    </div>
  );
};

export default DietPage;