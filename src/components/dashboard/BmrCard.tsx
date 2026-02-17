import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

const BmrCard = () => {
  const { profile, loading } = useSession();
  const [tdee, setTdee] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    const calculateTDEE = async () => {
      // Aguardar perfil carregar
      if (loading) {
        return;
      }

      // Verificar se todos os dados necessários estão presentes
      // Converter valores para números para verificação
      const weight = profile?.weight_kg ? (typeof profile.weight_kg === 'string' ? Number(profile.weight_kg) : profile.weight_kg) : null;
      const height = profile?.height_cm ? (typeof profile.height_cm === 'string' ? Number(profile.height_cm) : profile.height_cm) : null;
      const age = profile?.age ? (typeof profile.age === 'string' ? Number(profile.age) : profile.age) : null;

      const hasRequiredData = profile && 
        weight && !isNaN(weight) && weight > 0 &&
        height && !isNaN(height) && height > 0 &&
        age && !isNaN(age) && age > 0 &&
        profile.sex && 
        profile.routine;

      console.log('BmrCard: Verificando dados do perfil:', {
        hasProfile: !!profile,
        weight_kg: profile?.weight_kg,
        weight: weight,
        height_cm: profile?.height_cm,
        height: height,
        age: profile?.age,
        ageNum: age,
        sex: profile?.sex,
        routine: profile?.routine,
        hasRequiredData
      });

      if (!hasRequiredData) {
        console.log('BmrCard: Dados incompletos, não é possível calcular TDEE');
        setTdee(null);
        setCalculating(false);
        return;
      }

      setCalculating(true);

      // Cálculo direto (não precisa de retry pois é cálculo local)
      try {
        // Harris-Benedict Equation for BMR
        let bmr = 0;
        if (profile.sex === 'Masculino') {
          bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
        } else if (profile.sex === 'Feminino') {
          bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
        } else {
          setTdee(null);
          setCalculating(false);
          return;
        }

        // TDEE Multiplier based on routine
        const activityMultipliers: { [key: string]: number } = {
          'Sedentária': 1.2,
          'Ativa': 1.55,
          'Atleta': 1.9,
        };
        const multiplier = activityMultipliers[profile.routine] || 1.2;
        let calculatedTdee = bmr * multiplier;

        // Add calories from locomotion
        if (profile.locomotion_type && profile.locomotion_time_minutes && profile.locomotion_distance_km && profile.locomotion_days) {
          const locomotionDays = typeof profile.locomotion_days === 'string' 
            ? JSON.parse(profile.locomotion_days) 
            : profile.locomotion_days;
          
          if (Array.isArray(locomotionDays) && locomotionDays.length > 0) {
            const metValues: { [key: string]: number } = {
              'Caminha': 3.5,
              'Corre': 7.0,
              'Bicicleta': 6.0,
            };
            const met = metValues[profile.locomotion_type] || 0;
            if (met > 0) {
              const timeMinutes = typeof profile.locomotion_time_minutes === 'string' 
                ? Number(profile.locomotion_time_minutes) 
                : profile.locomotion_time_minutes;
              const caloriesPerSession = met * weight * (timeMinutes / 60);
              const weeklySessions = locomotionDays.length;
              const dailyExtraCalories = (caloriesPerSession * weeklySessions) / 7;
              calculatedTdee += dailyExtraCalories;
            }
          }
        }

        setTdee(Math.round(calculatedTdee));
        setCalculating(false);
      } catch (error) {
        console.error('Error calculating TDEE:', error);
        setTdee(null);
        setCalculating(false);
      }
    };

    calculateTDEE();

    // Listener para atualizar quando perfil for atualizado
    const handleProfileUpdate = () => {
      console.log('BmrCard: Perfil atualizado, recalculando TDEE...');
      calculateTDEE();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [profile, loading]);

  if (loading || calculating) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Gasto Calórico Diário
          </CardTitle>
          <Flame className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Gasto Calórico Diário
        </CardTitle>
        <Flame className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {tdee !== null ? (
          <>
            <div className="text-2xl font-bold text-primary">{tdee} kcal</div>
            <p className="text-xs text-muted-foreground">
              Estimativa de gasto total diário
            </p>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold">Dados incompletos</div>
            <p className="text-xs text-muted-foreground">
              <NavLink to="/settings" className="text-primary hover:underline transition-colors">Preencha seus dados</NavLink> para calcular.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BmrCard;