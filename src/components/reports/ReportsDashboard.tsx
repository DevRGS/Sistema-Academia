import { useState, useEffect, useMemo } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Activity, Clock, Pause, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subMonths, startOfMonth, endOfMonth, addDays, format, parseISO, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Recharts imports
import { Line } from 'recharts';
import { LineChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { WeightEntry } from '@/pages/WeightTrackingPage';
import { Workout } from '@/pages/Workouts';
import { loadExercises, type Exercise as ExerciseCSV } from '@/utils/exerciseService';

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
  performance: any;
  workout_duration_seconds?: number;
  rest_time_seconds?: number;
  workout_id?: string;
};

type PersonalRecord = {
  id: number;
  user_id: string;
  exercise_name: string;
  pr_weight: number;
  achieved_at: string;
};

type PeriodFilter = 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF69B4', '#32CD32', '#FFD700'];

// Normalize exercise name for matching (remove accents, uppercase, trim)
const normalizeExerciseName = (name: string): string => {
  return name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' '); // Normalize spaces
};

const ReportsDashboard = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('thisMonth');
  const [exercisesCSV, setExercisesCSV] = useState<ExerciseCSV[]>([]);
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>('all');

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [dailyNutritionLogs, setDailyNutritionLogs] = useState<DailyNutritionLog[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);

  // Load exercises CSV on mount
  useEffect(() => {
    const loadCSVExercises = async () => {
      try {
        const exercises = await loadExercises();
        setExercisesCSV(exercises);
      } catch (error) {
        console.error('Error loading exercises CSV:', error);
      }
    };
    loadCSVExercises();
  }, []);

  // Update date range based on period filter
  useEffect(() => {
    const now = new Date();
    switch (periodFilter) {
      case 'thisMonth':
        setDateRange({
          from: startOfMonth(now),
          to: endOfMonth(now),
        });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setDateRange({
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        });
        break;
      case 'thisYear':
        setDateRange({
          from: startOfYear(now),
          to: endOfMonth(now),
        });
        break;
      case 'custom':
        // Keep current dateRange
        break;
    }
  }, [periodFilter]);

  // Weight Chart Data
  const weightChartData = useMemo(() => weightHistory.map(entry => ({
    date: format(parseISO(entry.created_at), 'dd/MM', { locale: ptBR }),
    weight: entry.weight_kg,
  })), [weightHistory]);

  // Daily Nutrition Chart Data
  const nutritionChartData = useMemo(() => dailyNutritionLogs.map(log => ({
    date: format(parseISO(log.log_date), 'dd/MM', { locale: ptBR }),
    calories: log.total_calories,
    protein: log.total_protein_g,
    carbs: log.total_carbs_g,
    fat: log.total_fat_g,
  })), [dailyNutritionLogs]);

  // Workout Frequency Chart Data
  const workoutChartData = useMemo(() => {
    const workoutFrequencyMap = workoutLogs.reduce((acc, log) => {
      const date = format(parseISO(log.log_date), 'dd/MM/yyyy', { locale: ptBR });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(workoutFrequencyMap)
      .map(([date, count]) => ({ date, exercisesLogged: count }))
      .sort((a, b) => parseISO(a.date, { locale: ptBR }).getTime() - parseISO(b.date, { locale: ptBR }).getTime());
  }, [workoutLogs]);


  // Map exercise name to muscle group from CSV (case-insensitive, accent-insensitive)
  const exerciseToMuscleGroupMap = useMemo(() => {
    const map = new Map<string, string>();
    exercisesCSV.forEach(exercise => {
      const exerciseName = exercise.exercicio.trim();
      const normalizedName = normalizeExerciseName(exerciseName);
      
      // Store multiple variations for better matching
      map.set(exerciseName, exercise.grupo); // Original
      map.set(exerciseName.toUpperCase(), exercise.grupo); // Uppercase
      map.set(normalizedName, exercise.grupo); // Normalized (no accents, uppercase)
      map.set(exerciseName.toLowerCase(), exercise.grupo); // Lowercase
    });
    return map;
  }, [exercisesCSV]);

  // Muscle Group Distribution using TreeMap with real muscle groups from CSV (com porcentagens)
  const muscleGroupTreeData = useMemo(() => {
    const muscleGroupCounts: { [key: string]: number } = {};
    let totalExercises = 0;
    
    if (workoutLogs.length > 0 && exercisesCSV.length > 0) {
      workoutLogs.forEach(log => {
        const exerciseName = log.exercise_name.trim();
        const normalizedName = normalizeExerciseName(exerciseName);
        
        // Try multiple matching strategies
        const muscleGroup = exerciseToMuscleGroupMap.get(exerciseName) || 
                           exerciseToMuscleGroupMap.get(exerciseName.toUpperCase()) ||
                           exerciseToMuscleGroupMap.get(exerciseName.toLowerCase()) ||
                           exerciseToMuscleGroupMap.get(normalizedName) ||
                           'Outros';
        
        muscleGroupCounts[muscleGroup] = (muscleGroupCounts[muscleGroup] || 0) + 1;
        totalExercises++;
      });
    }

    // Calcular porcentagens
    const result = Object.entries(muscleGroupCounts).map(([name, value]) => ({
      name,
      value,
      percentage: totalExercises > 0 ? ((value / totalExercises) * 100).toFixed(1) : '0',
    }));

    // Debug log
    if (workoutLogs.length > 0 && exercisesCSV.length > 0 && result.length === 0) {
      console.log('ReportsDashboard: No muscle groups found. Workout logs:', workoutLogs.slice(0, 3).map(l => l.exercise_name));
      console.log('ReportsDashboard: Exercise map size:', exerciseToMuscleGroupMap.size);
      console.log('ReportsDashboard: Sample exercises from CSV:', exercisesCSV.slice(0, 3).map(e => e.exercicio));
      console.log('ReportsDashboard: Sample normalized workout log names:', workoutLogs.slice(0, 3).map(l => normalizeExerciseName(l.exercise_name)));
    }

    return result;
  }, [workoutLogs, exerciseToMuscleGroupMap, exercisesCSV]);

  // Stacked Bar Chart by Muscle Group - Get top exercises and their counts by group
  // Cada grupo muscular mostra apenas os exercícios que pertencem àquele grupo
  const { stackedBarData, topExercises } = useMemo(() => {
    const exerciseCountsByGroup: { [muscleGroup: string]: { [exerciseName: string]: number } } = {};
    
    workoutLogs.forEach(log => {
      const exerciseName = log.exercise_name.trim();
      const normalizedName = normalizeExerciseName(exerciseName);
      
      // Try multiple matching strategies
      const muscleGroup = exerciseToMuscleGroupMap.get(exerciseName) || 
                         exerciseToMuscleGroupMap.get(exerciseName.toUpperCase()) ||
                         exerciseToMuscleGroupMap.get(exerciseName.toLowerCase()) ||
                         exerciseToMuscleGroupMap.get(normalizedName) ||
                         'Outros';
      
      if (!exerciseCountsByGroup[muscleGroup]) {
        exerciseCountsByGroup[muscleGroup] = {};
      }
      exerciseCountsByGroup[muscleGroup][log.exercise_name] = 
        (exerciseCountsByGroup[muscleGroup][log.exercise_name] || 0) + 1;
    });

    // Coletar todos os exercícios únicos para criar as barras
    const allUniqueExercises = new Set<string>();
    Object.values(exerciseCountsByGroup).forEach(groupExercises => {
      Object.keys(groupExercises).forEach(exercise => {
        allUniqueExercises.add(exercise);
      });
    });

    // Para cada grupo, criar dataPoint com apenas os exercícios daquele grupo
    const groups = Object.keys(exerciseCountsByGroup);
    const data = groups.map(group => {
      const dataPoint: any = { name: group };
      
      // Adicionar apenas os exercícios que pertencem a este grupo
      allUniqueExercises.forEach(exerciseName => {
        const count = exerciseCountsByGroup[group][exerciseName] || 0;
        // Só adicionar se o exercício pertence a este grupo (count > 0)
        if (count > 0) {
          dataPoint[exerciseName] = count;
        } else {
          dataPoint[exerciseName] = 0; // Zero para manter a estrutura do gráfico
        }
      });
      
      return dataPoint;
    });

    return { 
      stackedBarData: data, 
      topExercises: Array.from(allUniqueExercises) // Todos os exercícios para a legenda
    };
  }, [workoutLogs, exerciseToMuscleGroupMap]);

  // Average workout time and rest time
  const { avgWorkoutTime, avgRestTime } = useMemo(() => {
    // Group logs by date to calculate workout duration
    const workoutsByDate: { [date: string]: WorkoutLog[] } = {};
    workoutLogs.forEach(log => {
      if (!workoutsByDate[log.log_date]) {
        workoutsByDate[log.log_date] = [];
      }
      workoutsByDate[log.log_date].push(log);
    });

    let totalWorkoutTime = 0;
    let totalRestTime = 0;
    let workoutCount = 0;
    let restCount = 0; // Contador de séries com descanso

    Object.values(workoutsByDate).forEach(logs => {
      // If workout_duration_seconds is available, use it
      const workoutDuration = logs[0]?.workout_duration_seconds;
      if (workoutDuration) {
        totalWorkoutTime += workoutDuration;
        workoutCount++;
      }

      // Calculate rest time from performance JSON (tempos individuais de cada série)
      logs.forEach(log => {
        try {
          const performance = typeof log.performance === 'string' ? JSON.parse(log.performance) : log.performance;
          if (Array.isArray(performance)) {
            performance.forEach((set: any) => {
              if (set.rest_time_seconds && set.rest_time_seconds > 0) {
                totalRestTime += set.rest_time_seconds;
                restCount++;
              }
            });
          }
        } catch (e) {
          // Se não conseguir parsear, usar rest_time_seconds do log (fallback)
          if (log.rest_time_seconds && log.rest_time_seconds > 0) {
            totalRestTime += log.rest_time_seconds;
            restCount++;
          }
        }
      });
    });

    return {
      avgWorkoutTime: workoutCount > 0 ? Math.round(totalWorkoutTime / workoutCount / 60) : 0, // in minutes
      avgRestTime: restCount > 0 ? Math.round(totalRestTime / restCount) : 0, // in seconds (média por série)
    };
  }, [workoutLogs, allWorkouts]);

  // Exercise statistics table
  const exerciseStats = useMemo(() => {
    const stats: {
      [exerciseName: string]: {
        count: number;
        weights: number[]; // Array de todos os pesos registrados
        times: number[]; // Array de todos os tempos de execução registrados
        maxWeight: number; // Peso máximo registrado
      }
    } = {};

    workoutLogs.forEach(log => {
      if (!stats[log.exercise_name]) {
        stats[log.exercise_name] = {
          count: 0,
          weights: [],
          times: [],
          maxWeight: 0,
        };
      }

      stats[log.exercise_name].count++;

      // Parse performance JSON to get weights and execution times
      try {
        const performance = typeof log.performance === 'string' ? JSON.parse(log.performance) : log.performance;
        if (Array.isArray(performance)) {
          performance.forEach((set: any) => {
            // Coletar pesos
            if (set.weight) {
              const weight = parseFloat(set.weight);
              if (!isNaN(weight) && weight > 0) {
                stats[log.exercise_name].weights.push(weight);
                if (weight > stats[log.exercise_name].maxWeight) {
                  stats[log.exercise_name].maxWeight = weight;
                }
              }
            }
            // Coletar tempos de execução (não de descanso)
            if (set.execution_time_seconds && set.execution_time_seconds > 0) {
              stats[log.exercise_name].times.push(set.execution_time_seconds);
            }
          });
        }
      } catch (e) {
        // Se não conseguir parsear, ignorar
      }
    });

    // Criar mapa de PRs (Personal Records) para cada exercício
    const prMap = new Map<string, number>();
    personalRecords.forEach(pr => {
      const currentMax = prMap.get(pr.exercise_name) || 0;
      if (pr.pr_weight > currentMax) {
        prMap.set(pr.exercise_name, pr.pr_weight);
      }
    });

    return Object.entries(stats).map(([exerciseName, data]) => {
      // Calcular peso médio: média de todos os pesos registrados
      const avgWeight = data.weights.length > 0 
        ? data.weights.reduce((sum, w) => sum + w, 0) / data.weights.length 
        : 0;

      // Calcular tempo médio: média de todos os tempos de execução (em minutos)
      const avgTime = data.times.length > 0
        ? (data.times.reduce((sum, t) => sum + t, 0) / data.times.length) / 60 // converter segundos para minutos
        : 0;

      // PR: usar o máximo do personal_records ou o máximo registrado nos logs
      const pr = prMap.get(exerciseName) || data.maxWeight;

      return {
        exerciseName,
        count: data.count,
        avgWeight,
        avgTime,
        pr,
        muscleGroup: (() => {
          const normalizedName = normalizeExerciseName(exerciseName);
          return exerciseToMuscleGroupMap.get(exerciseName) || 
                 exerciseToMuscleGroupMap.get(exerciseName.toUpperCase()) ||
                 exerciseToMuscleGroupMap.get(exerciseName.toLowerCase()) ||
                 exerciseToMuscleGroupMap.get(normalizedName) ||
                 'Outros';
        })(),
      };
    });
  }, [workoutLogs, allWorkouts, exerciseToMuscleGroupMap, personalRecords]);

  // Obter lista única de grupos musculares para o filtro
  const uniqueMuscleGroups = useMemo(() => {
    const groups = new Set(exerciseStats.map(stat => stat.muscleGroup));
    return Array.from(groups).sort();
  }, [exerciseStats]);

  // Filtrar e ordenar estatísticas de exercícios
  const filteredExerciseStats = useMemo(() => {
    let filtered = exerciseStats;
    
    if (muscleGroupFilter !== 'all') {
      filtered = exerciseStats.filter(stat => stat.muscleGroup === muscleGroupFilter);
    }
    
    return filtered.sort((a, b) => {
      // Primeiro ordenar por Grupo Muscular, depois por count
      if (a.muscleGroup !== b.muscleGroup) {
        return a.muscleGroup.localeCompare(b.muscleGroup);
      }
      return b.count - a.count;
    });
  }, [exerciseStats, muscleGroupFilter]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !dateRange?.from || !initialized) return;
      setLoading(true);

      try {
        const fromDate = dateRange.from.toISOString();
        const toDate = dateRange.to ? addDays(dateRange.to, 1).toISOString() : addDays(dateRange.from, 1).toISOString();

        const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
        const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);

        const [
          weightData,
          nutritionData,
          workoutLogsData,
          personalRecordsData,
          allWorkoutsData,
        ] = await Promise.all([
          select<WeightEntry>('weight_history', {
            eq: { column: 'user_id', value: userId },
            gte: { column: 'created_at', value: fromDate },
            lt: { column: 'created_at', value: toDate },
            order: { column: 'created_at', ascending: true },
          }),
          select<DailyNutritionLog>('daily_nutrition_logs', {
            eq: { column: 'user_id', value: userId },
            gte: { column: 'log_date', value: fromDate },
            lt: { column: 'log_date', value: toDate },
            order: { column: 'log_date', ascending: true },
          }),
          select<WorkoutLog>('workout_logs', {
            eq: { column: 'user_id', value: userId },
            gte: { column: 'log_date', value: fromDate },
            lt: { column: 'log_date', value: toDate },
            order: { column: 'log_date', ascending: true },
          }),
          select<PersonalRecord>('personal_records', {
            eq: { column: 'user_id', value: userId },
            gte: { column: 'achieved_at', value: fromDate },
            lt: { column: 'achieved_at', value: toDate },
            order: { column: 'achieved_at', ascending: true },
          }),
          select<Workout>('workouts', { eq: { column: 'user_id', value: userId } }),
        ]);

        setWeightHistory(weightData);
        setDailyNutritionLogs(nutritionData);
        setWorkoutLogs(workoutLogsData);
        setPersonalRecords(personalRecordsData);
        
        const parsedWorkouts = allWorkoutsData.map(workout => {
          if (workout.exercises && typeof workout.exercises === 'string') {
            try {
              workout.exercises = JSON.parse(workout.exercises);
            } catch (e) {
              console.error('Error parsing exercises:', e);
              workout.exercises = [];
            }
          }
          return workout;
        });
        setAllWorkouts(parsedWorkouts);
      } catch (error) {
        console.error('Error fetching reports data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!sessionLoading && !dbLoading && user && initialized) {
      fetchData();
    }
  }, [user, profile, sessionLoading, dbLoading, initialized, dateRange, spreadsheetId, select]);

  if (sessionLoading || loading) {
    return (
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Period Filter Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex gap-2 flex-wrap w-full sm:w-auto">
          <Button
            variant={periodFilter === 'thisMonth' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('thisMonth')}
          >
            Este Mês
          </Button>
          <Button
            variant={periodFilter === 'lastMonth' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('lastMonth')}
          >
            Mês Passado
          </Button>
          <Button
            variant={periodFilter === 'thisYear' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('thisYear')}
          >
            Este Ano
          </Button>
          <Button
            variant={periodFilter === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('custom')}
          >
            Período Personalizado
          </Button>
        </div>
        {periodFilter === 'custom' && (
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
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


        {/* Muscle Group Horizontal Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Exercícios por Grupo Muscular Histograma</CardTitle>
            <CardDescription>Distribuição dos exercícios logados por grupo muscular real.</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {workoutLogs.length === 0 ? (
              <div className="text-center text-muted-foreground space-y-2">
                <p>Nenhum exercício logado no período selecionado.</p>
                <p className="text-sm">Complete treinos para ver a distribuição por grupo muscular.</p>
              </div>
            ) : exercisesCSV.length === 0 ? (
              <div className="text-center text-muted-foreground space-y-2">
                <p>Carregando dados de exercícios...</p>
              </div>
            ) : muscleGroupTreeData.length > 0 ? (
              <div className="h-[400px] w-[calc(100vw-2rem)] sm:w-full -ml-2 sm:ml-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={muscleGroupTreeData}
                    layout="vertical"
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      type="number" 
                      label={{ value: 'Quantidade', position: 'insideBottom', offset: -5 }}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={80}
                      tick={{ fontSize: 13 }}
                      interval={0}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold mb-1">{data.name}</p>
                              <p className="text-sm">Exercícios: {data.value}</p>
                              <p className="text-sm">Porcentagem: {data.percentage}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {muscleGroupTreeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-muted-foreground space-y-2">
                <p>Nenhum exercício logado encontrado nos grupos musculares.</p>
                <p className="text-sm">Verifique se os nomes dos exercícios correspondem aos do arquivo CSV.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stacked Bar Chart by Muscle Group */}
        <Card>
          <CardHeader>
            <CardTitle>Exercícios por Grupo Muscular</CardTitle>
            <CardDescription>Distribuição de exercícios realizados por grupo muscular (top 10 exercícios por grupo).</CardDescription>
          </CardHeader>
          <CardContent>
            {stackedBarData.length > 0 ? (
              <div className="h-[300px] w-full max-w-[95vw]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stackedBarData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          // Filtrar apenas os exercícios que pertencem a este grupo (valores > 0)
                          const filteredPayload = payload.filter((item: any) => item.value > 0);
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold mb-2">{label}</p>
                              {filteredPayload.map((item: any, index: number) => (
                                <p key={index} style={{ color: item.color }} className="text-sm">
                                  {item.name}: {item.value}
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {topExercises.map((exerciseName, index) => (
                      <Bar
                        key={exerciseName}
                        dataKey={exerciseName}
                        stackId="a"
                        fill={COLORS[index % COLORS.length]}
                        name={exerciseName}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nenhum exercício logado para exibir.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Average Workout Time and Rest Time Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Treino</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgWorkoutTime} min</div>
            <p className="text-xs text-muted-foreground">
              Baseado nos treinos realizados no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio de Descanso</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRestTime} s</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio de descanso entre exercícios
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Statistics Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <CardTitle>Estatísticas de Exercícios</CardTitle>
              <CardDescription>Detalhes dos exercícios realizados no período selecionado.</CardDescription>
            </div>
            {exerciseStats.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={muscleGroupFilter} onValueChange={setMuscleGroupFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Grupos</SelectItem>
                    {uniqueMuscleGroups.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredExerciseStats.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercício</TableHead>
                    <TableHead>Grupo Muscular</TableHead>
                    <TableHead className="text-right">Quantidade de Vezes</TableHead>
                    <TableHead className="text-right">Peso Médio (kg)</TableHead>
                    <TableHead className="text-right">Tempo Médio (min)</TableHead>
                    <TableHead className="text-right">PR (kg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExerciseStats.map((stat, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{stat.exerciseName}</TableCell>
                      <TableCell>{stat.muscleGroup}</TableCell>
                      <TableCell className="text-right">{stat.count}</TableCell>
                      <TableCell className="text-right">{stat.avgWeight > 0 ? stat.avgWeight.toFixed(1) : '-'}</TableCell>
                      <TableCell className="text-right">{stat.avgTime > 0 ? stat.avgTime.toFixed(1) : '-'}</TableCell>
                      <TableCell className="text-right font-bold">{stat.pr > 0 ? stat.pr.toFixed(1) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              {muscleGroupFilter !== 'all' 
                ? 'Nenhum exercício encontrado para o grupo muscular selecionado.' 
                : 'Nenhum exercício realizado no período selecionado.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsDashboard;
