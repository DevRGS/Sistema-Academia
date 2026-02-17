import { useState, useEffect, useMemo } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { NavLink } from 'react-router-dom';
import MealCard from '@/components/diet/MealCard';
import DietTotalsCard from '@/components/diet/DietTotalsCard';
import AddMealDialog from '@/components/admin/AddMealDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Utensils, PlusCircle, Home } from 'lucide-react';

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
  const { user, profile } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [dietPlan, setDietPlan] = useState<DietPlan[]>([]);
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddMealDialogOpen, setIsAddMealDialogOpen] = useState(false);
  const isStudent = profile?.role === 'student';
  const isPersonal = profile?.role === 'personal';

  const fetchData = async () => {
    if (!user || !initialized) return;
    setLoading(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // If viewing a shared spreadsheet (not own), use profile.id (which will be the student's ID)
      // Otherwise, use user.id (the full Google ID) to avoid truncation issues
      const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
      
      const [plans, logs] = await Promise.all([
        select<DietPlan>('diet_plans', { eq: { column: 'user_id', value: userId } }),
        select<DietLog>('diet_logs', {
          eq: { column: 'user_id', value: userId },
          gte: { column: 'logged_at', value: today.toISOString() },
          lt: { column: 'logged_at', value: tomorrow.toISOString() },
        }),
      ]);

      const sortedPlan = plans.sort((a, b) => mealOrder[a.meal] - mealOrder[b.meal]);
      setDietPlan(sortedPlan);
      setDietLogs(logs);
    } catch (error) {
      console.error('Error fetching diet data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized && !dbLoading) {
      fetchData();
    }
  }, [user, profile, initialized, dbLoading, spreadsheetId]);

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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold">{isPersonal ? 'Dieta do Aluno' : 'Minha Dieta'}</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" asChild size="sm" className="sm:hidden">
              <NavLink to="/dashboard">
                <Home className="h-4 w-4" />
              </NavLink>
            </Button>
            <Button variant="outline" asChild className="hidden sm:flex">
              <NavLink to="/dashboard">
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </NavLink>
            </Button>
            {(isStudent || isPersonal) && user && (
              <Button onClick={() => setIsAddMealDialogOpen(true)} size="sm" className="flex-1 sm:flex-initial">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Refeição
              </Button>
            )}
          </div>
        </div>
        <Alert>
          <Utensils className="h-4 w-4" />
          <AlertTitle>Nenhum plano de dieta encontrado!</AlertTitle>
          <AlertDescription>
            Você ainda não tem um plano de dieta cadastrado. Você pode criar seu próprio plano ou entrar em contato com seu instrutor.
          </AlertDescription>
        </Alert>
        
        {(isStudent || isPersonal) && user && (
          <AddMealDialog
            isOpen={isAddMealDialogOpen}
            setIsOpen={setIsAddMealDialogOpen}
            studentId={(isPersonal && profile?.id) ? String(profile.id) : String(user.id)}
            onMealAdded={fetchData}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">{isPersonal ? 'Dieta do Aluno' : 'Minha Dieta'}</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild size="sm" className="sm:hidden">
            <NavLink to="/dashboard">
              <Home className="h-4 w-4" />
            </NavLink>
          </Button>
          <Button variant="outline" asChild className="hidden sm:flex">
            <NavLink to="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </NavLink>
          </Button>
          {(isStudent || isPersonal) && user && (
            <Button onClick={() => setIsAddMealDialogOpen(true)} size="sm" className="flex-1 sm:flex-initial">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Refeição
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-4 pb-32 overflow-x-hidden">
        {dietPlan.map((meal) => {
          const isLogged = dietLogs.some(log => log.diet_plan_id === meal.id);
          return <MealCard key={meal.id} meal={meal} isLogged={isLogged} onMealLogged={handleMealLogged} />;
        })}
      </div>
      <DietTotalsCard consumed={consumedTotals} target={targetTotals} />
      
      {(isStudent || isPersonal) && user && (
        <AddMealDialog
          isOpen={isAddMealDialogOpen}
          setIsOpen={setIsAddMealDialogOpen}
          studentId={(isPersonal && profile?.id) ? String(profile.id) : String(user.id)}
          onMealAdded={fetchData}
        />
      )}
    </div>
  );
};

export default DietPage;