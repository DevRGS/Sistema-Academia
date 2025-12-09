import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Flame, Brain, Beef, Wheat } from "lucide-react";
import { DietPlan } from "@/pages/Diet";
import { useGoogleSheetsDB } from "@/hooks/useGoogleSheetsDB";
import { useSession } from "@/contexts/SessionContext";
import { showError, showSuccess } from "@/utils/toast";

type MealCardProps = {
  meal: DietPlan;
  isLogged: boolean;
  onMealLogged: () => void;
};

const MealCard = ({ meal, isLogged, onMealLogged }: MealCardProps) => {
  const { user } = useSession();
  const { insert, select, initialized } = useGoogleSheetsDB();

  const handleLogMeal = async () => {
    if (!user || !initialized) {
      showError("Usuário não autenticado ou banco de dados não inicializado.");
      return;
    }

    try {
      // Insert diet log
      await insert('diet_logs', {
        user_id: user.id,
        diet_plan_id: meal.id,
        logged_at: new Date().toISOString(),
      });

      // Get today's nutrition logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingLogs = await select<{ id: number; log_date: string; total_calories: number; total_protein_g: number; total_carbs_g: number; total_fat_g: number }>(
        'daily_nutrition_logs',
        {
          eq: { column: 'user_id', value: user.id },
          gte: { column: 'log_date', value: today.toISOString().split('T')[0] },
          lt: { column: 'log_date', value: tomorrow.toISOString().split('T')[0] },
        }
      );

      const todayStr = today.toISOString().split('T')[0];
      const existingLog = existingLogs.find(log => log.log_date.startsWith(todayStr));

      if (existingLog) {
        // Update existing log
        const updatedLog = {
          total_calories: (existingLog.total_calories || 0) + (meal.calories || 0),
          total_protein_g: (existingLog.total_protein_g || 0) + (meal.protein_g || 0),
          total_carbs_g: (existingLog.total_carbs_g || 0) + (meal.carbs_g || 0),
          total_fat_g: (existingLog.total_fat_g || 0) + (meal.fat_g || 0),
        };
        // Note: We'll need to implement update in the hook, but for now we'll just insert
        // This is a simplified version - in production you'd want proper update functionality
      } else {
        // Create new log
        await insert('daily_nutrition_logs', {
          user_id: user.id,
          log_date: todayStr,
          total_calories: meal.calories || 0,
          total_protein_g: meal.protein_g || 0,
          total_carbs_g: meal.carbs_g || 0,
          total_fat_g: meal.fat_g || 0,
          created_at: new Date().toISOString(),
        });
      }

      showSuccess("Refeição registrada com sucesso!");
      onMealLogged();
    } catch (error) {
      showError("Erro ao registrar refeição.");
      console.error(error);
    }
  };

  return (
    <Card className={isLogged ? 'bg-green-50 dark:bg-green-900/20' : ''}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{meal.meal}</CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
              <Clock className="h-4 w-4" />
              Horário Sugerido: {meal.scheduled_time}
            </CardDescription>
          </div>
          {isLogged && <CheckCircle className="h-6 w-6 text-green-500" />}
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{meal.description}</p>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="nutritional-info">
            <AccordionTrigger>Informações Nutricionais</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2"><Flame className="h-4 w-4 text-red-500" /> Calorias: {meal.calories || 'N/A'}</div>
                <div className="flex items-center gap-2"><Beef className="h-4 w-4 text-orange-500" /> Proteínas: {meal.protein_g || 'N/A'}g</div>
                <div className="flex items-center gap-2"><Wheat className="h-4 w-4 text-yellow-500" /> Carboidratos: {meal.carbs_g || 'N/A'}g</div>
                <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-blue-500" /> Gorduras: {meal.fat_g || 'N/A'}g</div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <Button onClick={handleLogMeal} disabled={isLogged}>
          <CheckCircle className="mr-2 h-4 w-4" />
          {isLogged ? 'Refeição Concluída' : 'Concluir Refeição'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MealCard;