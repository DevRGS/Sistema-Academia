import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const BmrCard = () => {
  const { profile } = useSession();
  const [tdee, setTdee] = useState<number | null>(null);

  useEffect(() => {
    if (profile && profile.weight_kg && profile.height_cm && profile.age && profile.sex && profile.routine) {
      // Harris-Benedict Equation for BMR
      let bmr = 0;
      if (profile.sex === 'Masculino') {
        bmr = 88.362 + (13.397 * profile.weight_kg) + (4.799 * profile.height_cm) - (5.677 * profile.age);
      } else if (profile.sex === 'Feminino') {
        bmr = 447.593 + (9.247 * profile.weight_kg) + (3.098 * profile.height_cm) - (4.330 * profile.age);
      }

      // TDEE Multiplier based on routine
      const activityMultipliers = {
        'Sedentária': 1.2,
        'Ativa': 1.55,
        'Atleta': 1.9,
      };
      const multiplier = activityMultipliers[profile.routine] || 1.2;
      let calculatedTdee = bmr * multiplier;

      // Add calories from locomotion
      if (profile.locomotion_type && profile.locomotion_time_minutes && profile.locomotion_distance_km && profile.locomotion_days && profile.locomotion_days.length > 0) {
        const metValues = {
          'Caminha': 3.5,
          'Corre': 7.0,
          'Bicicleta': 6.0,
        };
        const met = metValues[profile.locomotion_type] || 0;
        if (met > 0) {
          const caloriesPerSession = met * profile.weight_kg * (profile.locomotion_time_minutes / 60);
          const weeklySessions = profile.locomotion_days.length;
          const dailyExtraCalories = (caloriesPerSession * weeklySessions) / 7;
          calculatedTdee += dailyExtraCalories;
        }
      }

      setTdee(Math.round(calculatedTdee));
    } else {
      setTdee(null);
    }
  }, [profile]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Gasto Calórico Diário
        </CardTitle>
        <Flame className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {tdee !== null ? (
          <>
            <div className="text-2xl font-bold">{tdee} kcal</div>
            <p className="text-xs text-muted-foreground">
              Estimativa de gasto total diário
            </p>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold">Dados incompletos</div>
            <p className="text-xs text-muted-foreground">
              <NavLink to="/settings" className="underline">Preencha seus dados</NavLink> para calcular.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BmrCard;