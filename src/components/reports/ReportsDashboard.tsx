import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeightEntry } from '@/pages/WeightTrackingPage';
import { BioimpedanceRecord } from '@/pages/BioimpedancePage';
import { Workout, Exercise } from '@/pages/Workouts'; // Import Workout and Exercise types
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Activity } from 'lucide-react';

// Define types for data used in reports
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

type WorkoutLog = {
  id: number;
  user_id: string;
  exercise_name: string;
  log_date: string;
  performance: any; // Adjust as per your actual performance data structure
};

type PersonalRecord = {
  id: number;
  user_id: string;
  exercise_name: string;
  pr_weight: number;
  achieved_at: string; // date string
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF69B4', '#32CD32', '#FFD700'];

const ReportsDashboard = () => {
  const { user, loading: sessionLoading } = useSession();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(startOfMonth(new Date()), 1),
    to: endOfMonth(new Date()),
  });

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [bioimpedanceHistory, setBioimpedanceHistory] = useState<BioimpedanceRecord[]>([]);
  const [dailyNutritionLogs, setDailyNutritionLogs] = useState<DailyNutritionLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]); // To map exercises to muscle groups/workout names

  const fetchData = async () => {
    if (!user || !dateRange?.from) return;
    setLoading(true);

    const fromDate = dateRange.from.toISOString();
    const toDate = dateRange.to ? addDays(dateRange.to, 1).toISOString() : addDays(dateRange.from, 1).toISOString();

    const [
      weightResponse,
      bioimpedanceResponse,
      nutritionResponse,
      workoutLogsResponse,
      personalRecordsResponse,
      allWorkoutsResponse,
    ] = await Promise.all([
      supabase.from('weight_history').select('*').eq('user_id', user.id)
        .gte('created_at', fromDate)
        .lt('created_at', toDate)
        .order('created_at', { ascending: true }),
      supabase.from('bioimpedance_records').select('*').eq('user_id', user.id)
        .gte('record_date', fromDate)
        .lt('record_date', toDate)
        .order('record_date', { ascending: true }),
      supabase.from('daily_nutrition_logs').select('*').eq('user_id', user.id)
        .gte('log_date', fromDate)
        .lt('log_date', toDate)
        .order('log_date', { ascending: true }),
      supabase.from('workout_logs').select('*').eq('user_id', user.id)
        .gte('log_date', fromDate)
        .lt('log_date', toDate)
        .order('log_date', { ascending: true }),
      supabase.from('personal_records').select('*').eq('user_id', user.id)
        .gte('achieved_at', fromDate)
        .lt('achieved_at', toDate)
        .order('achieved_at', { ascending: true }),
      supabase.from('workouts').select('*').eq('user_id', user.id), // Fetch all workouts for mapping
    ]);

    if (weightResponse.error) console.error('Error fetching weight history:', weightResponse.error);
    else setWeightHistory(weightResponse.data as WeightEntry[]);

    if (bioimpedanceResponse.error) console.error('Error fetching bioimpedance history:', bioimpedanceResponse.error);
    else setBioimpedanceHistory(bioimpedanceResponse.data as BioimpedanceRecord[]);

    if (nutritionResponse.error) console.error('Error fetching daily nutrition logs:', nutritionResponse.error);
    else setDailyNutritionLogs(nutritionResponse.data as DailyNutritionLog[]);

    if (workoutLogsResponse.error) console.error('Error fetching workout logs:', workoutLogsResponse.error);
    else setWorkoutLogs(workoutLogsResponse.data as WorkoutLog[]);

    if (personalRecordsResponse.error) console.error('Error fetching personal records:', personalRecordsResponse.error);
    else setPersonalRecords(personalRecordsResponse.data as PersonalRecord[]);

    if (allWorkoutsResponse.error) console.error('Error fetching all workouts:', allWorkoutsResponse.error);
    else setAllWorkouts(allWorkoutsResponse.data as Workout[]);

    setLoading(false);
  };

  useEffect(() => {
    if (!sessionLoading && user) {
      fetchData();
    }
  }, [user, sessionLoading, dateRange]); // Re-fetch when dateRange changes

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

  // Workout Frequency Chart Data (distinct log dates)
  const workoutFrequencyMap = workoutLogs.reduce((acc, log) => {
    const date = format(parseISO(log.log_date), 'dd/MM/yyyy', { locale: ptBR });
    acc[date] = (acc[date] || 0) + 1; // Count logged exercises per day
    return acc;
  }, {} as Record<string, number>);

  const workoutChartData = Object.entries(workoutFrequencyMap)
    .map(([date, count]) => ({ date, exercisesLogged: count }))
    .sort((a, b) => parseISO(a.date, { locale: ptBR }).getTime() - parseISO(b.date, { locale: ptBR }).getTime());

  // Strength Evolution (Personal Records)
  const prChartData = useMemo(() => {
    const exercisePRs: { [key: string]: { date: string; weight: number }[] } = {};
    personalRecords.forEach(pr => {
      if (!exercisePRs[pr.exercise_name]) {
        exercisePRs[pr.exercise_name] = [];
      }
      exercisePRs[pr.exercise_name].push({
        date: format(parseISO(pr.achieved_at), 'dd/MM', { locale: ptBR }),
        weight: pr.pr_weight,
      });
    });

    // Sort each exercise's PRs by date
    for (const exerciseName in exercisePRs) {
      exercisePRs[exerciseName].sort((a, b) => parseISO(a.date, { locale: ptBR }).getTime() - parseISO(b.date, { locale: ptBR }).getTime());
    }
    return exercisePRs;
  }, [personalRecords]);

  // Workouts per Muscle Group & Percentage of Total Logged Exercises per Workout Name
  const { muscleGroupDistribution, workoutNameDistribution, mostPerformedExercise } = useMemo(() => {
    const exerciseToMuscleGroupMap = new Map<string, string>();
    const exerciseToWorkoutNameMap = new Map<string, string>();

    allWorkouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        exerciseToMuscleGroupMap.set(exercise.name, workout.muscle_group);
        exerciseToWorkoutNameMap.set(exercise.name, workout.name);
      });
    });

    const muscleGroupCounts: { [key: string]: number } = {};
    const workoutNameCounts: { [key: string]: number } = {};
    const exerciseCounts: { [key: string]: number } = {};
    let totalLoggedExercises = 0;

    workoutLogs.forEach(log => {
      totalLoggedExercises++;
      const muscleGroup = exerciseToMuscleGroupMap.get(log.exercise_name);
      if (muscleGroup) {
        muscleGroupCounts[muscleGroup] = (muscleGroupCounts[muscleGroup] || 0) + 1;
      }
      const workoutName = exerciseToWorkoutNameMap.get(log.exercise_name);
      if (workoutName) {
        workoutNameCounts[workoutName] = (workoutNameCounts[workoutName] || 0) + 1;
      }
      exerciseCounts[log.exercise_name] = (exerciseCounts[log.exercise_name] || 0) + 1;
    });

    const muscleGroupPieData = Object.entries(muscleGroupCounts).map(([name, value]) => ({
      name,
      value,
      percentage: totalLoggedExercises > 0 ? (value / totalLoggedExercises) * 100 : 0,
    }));

    const workoutNamePieData = Object.entries(workoutNameCounts).map(([name, value]) => ({
      name,
      value,
      percentage: totalLoggedExercises > 0 ? (value / totalLoggedExercises) * 100 : 0,
    }));

    const sortedExercises = Object.entries(exerciseCounts).sort(([, countA], [, countB]) => countB - countA);
    const mostPerformedExercise = sortedExercises.length > 0 ? sortedExercises[0][0] : 'N/A';

    return { muscleGroupDistribution: muscleGroupPieData, workoutNameDistribution: workoutNamePieData, mostPerformedExercise };
  }, [workoutLogs, allWorkouts]);


  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
      </div>

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
            <CardTitle>Frequência de Exercícios Logados</CardTitle>
            <CardDescription>Número de exercícios registrados por dia.</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workoutChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} label={{ value: 'Nº de Exercícios', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="exercisesLogged" fill="#8884d8" name="Exercícios Logados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nenhum registro de treino para exibir.</p>
            )}
          </CardContent>
        </Card>

        {/* Strength Evolution Chart (Personal Records) */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Força (Recordes Pessoais)</CardTitle>
            <CardDescription>Acompanhe seus recordes pessoais ao longo do tempo.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(prChartData).length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" type="category" allowDuplicatedCategory={false} />
                    <YAxis label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    {Object.entries(prChartData).map(([exerciseName, data], index) => (
                      <Line
                        key={exerciseName}
                        type="monotone"
                        dataKey="weight"
                        data={data}
                        name={exerciseName}
                        stroke={COLORS[index % COLORS.length]}
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nenhum recorde pessoal para exibir.</p>
            )}
          </CardContent>
        </Card>

        {/* Workouts per Muscle Group Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Exercícios por Grupo Muscular</CardTitle>
            <CardDescription>Distribuição dos exercícios logados por grupo muscular.</CardDescription>
          </CardHeader>
          <CardContent>
            {muscleGroupDistribution.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={muscleGroupDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                    >
                      {muscleGroupDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string, props) => [`${value} logs (${props.payload.percentage.toFixed(1)}%)`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nenhum exercício logado para exibir por grupo muscular.</p>
            )}
          </CardContent>
        </Card>

        {/* Percentage of Total Logged Exercises per Workout Name Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Exercícios por Treino</CardTitle>
            <CardDescription>Percentual de exercícios logados para cada treino.</CardDescription>
          </CardHeader>
          <CardContent>
            {workoutNameDistribution.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workoutNameDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                    >
                      {workoutNameDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string, props) => [`${value} logs (${props.payload.percentage.toFixed(1)}%)`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nenhum exercício logado para exibir por treino.</p>
            )}
          </CardContent>
        </Card>

        {/* Most Performed Exercise Card */}
        <Card>
          <CardHeader>
            <CardTitle>Exercício Mais Realizado</CardTitle>
            <CardDescription>O exercício mais frequente no período selecionado.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostPerformedExercise}</div>
            <p className="text-xs text-muted-foreground">
              Baseado nos exercícios logados.
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ReportsDashboard;