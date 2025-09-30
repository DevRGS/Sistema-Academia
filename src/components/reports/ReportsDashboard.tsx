import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeightEntry } from '@/pages/WeightTrackingPage';
import { BioimpedanceRecord } from '@/pages/BioimpedancePage';
// Assuming DailyNutritionLog type is available or defined here
type DailyNutritionLog = {
  id: number;
  user_id: string;
  log_date: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  created_at: string;
};

// Assuming WorkoutLog type is available or defined here
type WorkoutLog = {
  id: number;
  user_id: string;
  exercise_name: string;
  log_date: string;
  performance: any; // Adjust as per your actual performance data structure
};
import { Activity } from 'lucide-react';


const ReportsDashboard = () => {
  const { user, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [bioimpedanceHistory, setBioimpedanceHistory] = useState<BioimpedanceRecord[]>([]);
  const [dailyNutritionLogs, setDailyNutritionLogs] = useState<DailyNutritionLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [
      weightResponse,
      bioimpedanceResponse,
      nutritionResponse,
      workoutResponse,
    ] = await Promise.all([
      supabase.from('weight_history').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
      supabase.from('bioimpedance_records').select('*').eq('user_id', user.id).order('record_date', { ascending: true }),
      supabase.from('daily_nutrition_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: true }),
      supabase.from('workout_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: true }),
    ]);

    if (weightResponse.error) console.error('Error fetching weight history:', weightResponse.error);
    else setWeightHistory(weightResponse.data as WeightEntry[]);

    if (bioimpedanceResponse.error) console.error('Error fetching bioimpedance history:', bioimpedanceResponse.error);
    else setBioimpedanceHistory(bioimpedanceResponse.data as BioimpedanceRecord[]);

    if (nutritionResponse.error) console.error('Error fetching daily nutrition logs:', nutritionResponse.error);
    else setDailyNutritionLogs(nutritionResponse.data as DailyNutritionLog[]);

    if (workoutResponse.error) console.error('Error fetching workout logs:', workoutResponse.error);
    else setWorkoutLogs(workoutResponse.data as WorkoutLog[]);

    setLoading(false);
  };

  useEffect(() => {
    if (!sessionLoading && user) {
      fetchData();
    }
  }, [user, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>Erro de Autenticação</AlertTitle>
        <AlertDescription>
          Você precisa estar logado para acessar os relatórios.
        </AlertDescription>
      </Alert>
    );
  }

  // --- Chart Data Preparation ---

  // Weight Chart Data
  const weightChartData = weightHistory.map(entry => ({
    date: format(parseISO(entry.created_at), 'dd/MM', { locale: ptBR }),
    weight: entry.weight_kg,
  }));

  // Bioimpedance Chart Data (simplified for dashboard)
  const bioimpedanceChartData = bioimpedanceHistory.map(entry => ({
    date: format(parseISO(entry.record_date), 'dd/MM', { locale: ptBR }),
    body_fat_percentage: entry.body_fat_percentage,
    muscle_mass_kg: entry.muscle_mass_kg,
    bmi: entry.bmi,
  }));

  // Daily Nutrition Chart Data
  const nutritionChartData = dailyNutritionLogs.map(log => ({
    date: format(parseISO(log.log_date), 'dd/MM', { locale: ptBR }),
    calories: log.total_calories,
    protein: log.total_protein_g,
    carbs: log.total_carbs_g,
    fat: log.total_fat_g,
  }));

  // Workout Frequency Chart Data
  const workoutFrequencyData = workoutLogs.reduce((acc, log) => {
    const date = format(parseISO(log.log_date), 'dd/MM/yyyy', { locale: ptBR });
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const workoutChartData = Object.entries(workoutFrequencyData)
    .map(([date, count]) => ({ date, workouts: count }))
    .sort((a, b) => parseISO(a.date, { locale: ptBR }).getTime() - parseISO(b.date, { locale: ptBR }).getTime());


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      {/* Weight History Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Peso</CardTitle>
          <CardDescription>Evolução do seu peso ao longo do tempo.</CardDescription>
        </CardHeader>
        <CardContent>
          {weightChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="weight" stroke="#8884d8" name="Peso (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Nenhum dado de peso para exibir.</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Nutrition Summary Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Nutricional Diário</CardTitle>
          <CardDescription>Consumo de calorias e macronutrientes por dia.</CardDescription>
        </CardHeader>
        <CardContent>
          {nutritionChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nutritionChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="calories" stroke="#8884d8" name="Calorias (kcal)" />
                  <Line type="monotone" dataKey="protein" stroke="#82ca9d" name="Proteína (g)" />
                  <Line type="monotone" dataKey="carbs" stroke="#ffc658" name="Carboidratos (g)" />
                  <Line type="monotone" dataKey="fat" stroke="#ff7300" name="Gorduras (g)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Nenhum registro nutricional para exibir.</p>
          )}
        </CardContent>
      </Card>

      {/* Bioimpedance Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendências de Bioimpedância</CardTitle>
          <CardDescription>Acompanhe as mudanças em suas métricas corporais.</CardDescription>
        </CardHeader>
        <CardContent>
          {bioimpedanceChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bioimpedanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" label={{ value: 'Massa (kg) / IMC', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Percentual (%)', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="right" type="monotone" dataKey="body_fat_percentage" stroke="#82ca9d" name="Gordura Corporal (%)" />
                  <Line yAxisId="left" type="monotone" dataKey="muscle_mass_kg" stroke="#ffc658" name="Massa Muscular (kg)" />
                  <Line yAxisId="left" type="monotone" dataKey="bmi" stroke="#8884d8" name="IMC" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Nenhum dado de bioimpedância para exibir.</p>
          )}
        </CardContent>
      </Card>

      {/* Workout Frequency Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Frequência de Treinos</CardTitle>
          <CardDescription>Número de treinos registrados por dia.</CardDescription>
        </CardHeader>
        <CardContent>
          {workoutChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workoutChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} label={{ value: 'Nº de Treinos', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="workouts" fill="#8884d8" name="Treinos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">Nenhum registro de treino para exibir.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsDashboard;