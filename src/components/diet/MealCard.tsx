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
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showError, showSuccess } from "@/utils/toast";

type MealCardProps = {
  meal: DietPlan;
  isLogged: boolean;
  onMealLogged: () => void;
};

const MealCard = ({ meal, isLogged, onMealLogged }: MealCardProps) => {
  const { user } = useSession();

  const handleLogMeal = async () => {
    if (!user) return;

    const { error } = await supabase.from('diet_logs').insert({
      user_id: user.id,
      diet_plan_id: meal.id,
    });

    if (error) {
      showError("Erro ao registrar refeição.");
      console.error(error);
    } else {
      showSuccess("Refeição registrada com sucesso!");
      onMealLogged();
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