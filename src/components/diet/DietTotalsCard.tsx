import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Beef, Wheat, Brain } from "lucide-react";

type Totals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type DietTotalsCardProps = {
  consumed: Totals;
  target: Totals;
};

const DietTotalsCard = ({ consumed, target }: DietTotalsCardProps) => {
  const calculateProgress = (consumedValue: number, targetValue: number) => {
    if (targetValue === 0) return 0;
    return (consumedValue / targetValue) * 100;
  };

  return (
    <Card className="sticky bottom-4 shadow-lg">
      <CardHeader>
        <CardTitle>Resumo do Dia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <NutrientProgress
            icon={<Flame className="h-5 w-5 text-red-500" />}
            label="Calorias"
            consumed={consumed.calories}
            target={target.calories}
            unit="kcal"
            progress={calculateProgress(consumed.calories, target.calories)}
          />
          <NutrientProgress
            icon={<Beef className="h-5 w-5 text-orange-500" />}
            label="Proteínas"
            consumed={consumed.protein}
            target={target.protein}
            unit="g"
            progress={calculateProgress(consumed.protein, target.protein)}
          />
          <NutrientProgress
            icon={<Wheat className="h-5 w-5 text-yellow-500" />}
            label="Carboidratos"
            consumed={consumed.carbs}
            target={target.carbs}
            unit="g"
            progress={calculateProgress(consumed.carbs, target.carbs)}
          />
          <NutrientProgress
            icon={<Brain className="h-5 w-5 text-blue-500" />}
            label="Gorduras"
            consumed={consumed.fat}
            target={target.fat}
            unit="g"
            progress={calculateProgress(consumed.fat, target.fat)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const NutrientProgress = ({ icon, label, consumed, target, unit, progress }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">
        {Math.round(consumed)} / {Math.round(target)} {unit}
      </span>
    </div>
    <Progress value={progress} />
  </div>
);

export default DietTotalsCard;