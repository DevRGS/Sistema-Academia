import { useState, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Workout } from './Workouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import Timer from '@/components/workouts/Timer';
import ExerciseGifDialog from '@/components/workouts/ExerciseGifDialog';
import { showError, showSuccess } from '@/utils/toast';
import { CheckCircle, PartyPopper, Home, Play, Info, ArrowRight, Pause, PlayCircle, Clock } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { hasExerciseGif } from '@/utils/exerciseGifs';
import { Alert, AlertDescription } from '@/components/ui/alert';

type PerformanceData = {
  sets: {
    reps: string;
    weight: string;
    execution_time_seconds?: number; // Tempo de execução da série
    rest_time_seconds?: number; // Tempo de descanso após a série
  }[];
  exercise_time_seconds?: number; // Tempo total do exercício
};

type FormData = {
  exercises: PerformanceData[];
};

const WorkoutSessionPage = () => {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const { select, insert, initialized } = useGoogleSheetsDB();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showGif, setShowGif] = useState(false);
  
  // Estados para cronômetros de séries
  const [setTimers, setSetTimers] = useState<{
    [exerciseIndex: number]: {
      [setIndex: number]: {
        executionStart: Date | null;
        executionTime: number;
        restStart: Date | null;
        restTime: number;
        state: 'idle' | 'executing' | 'resting' | 'rest_complete';
      };
    };
  }>({});
  
  // Estado para descanso entre exercícios
  const [isRestingBetweenExercises, setIsRestingBetweenExercises] = useState(false);
  const [restStartTime, setRestStartTime] = useState<Date | null>(null);
  const [restElapsedTime, setRestElapsedTime] = useState(0);
  
  // Tempo de início de cada exercício
  const [exerciseStartTimes, setExerciseStartTimes] = useState<{ [index: number]: Date }>({});

  const { control, getValues, setValue } = useForm<FormData>({
    defaultValues: {
      exercises: [],
    },
  });

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!workoutId || !initialized) return;
      setLoading(true);
      try {
        const workouts = await select<Workout>('workouts', { eq: { column: 'id', value: workoutId } });
        if (workouts.length > 0) {
          // Parse exercises from JSON string to array
          const workout = workouts[0];
          if (workout.exercises && typeof workout.exercises === 'string') {
            try {
              workout.exercises = JSON.parse(workout.exercises);
            } catch (e) {
              console.error('Error parsing exercises:', e);
              workout.exercises = [];
            }
          }
          setWorkout(workout);
          setStartTime(new Date());
        } else {
          showError('Treino não encontrado.');
          navigate('/workouts');
        }
      } catch (error) {
        showError('Erro ao carregar o treino.');
        navigate('/workouts');
      } finally {
        setLoading(false);
      }
    };
    fetchWorkout();
  }, [workoutId, navigate, initialized]);

  useEffect(() => {
    if (!startTime || isFinished) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  // Cronômetro de descanso entre exercícios
  useEffect(() => {
    if (!isRestingBetweenExercises || !restStartTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - restStartTime.getTime()) / 1000);
      setRestElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRestingBetweenExercises, restStartTime]);

  // Cronômetros de execução e descanso das séries
  useEffect(() => {
    const interval = setInterval(() => {
      setSetTimers(prev => {
        const updated = { ...prev };
        const now = new Date();

        Object.keys(updated).forEach(exIndex => {
          const exerciseIndex = parseInt(exIndex);
          Object.keys(updated[exerciseIndex]).forEach(setIdx => {
            const setIndex = parseInt(setIdx);
            const timer = updated[exerciseIndex][setIndex];

            if (timer.state === 'executing' && timer.executionStart) {
              updated[exerciseIndex][setIndex] = {
                ...timer,
                executionTime: Math.floor((now.getTime() - timer.executionStart.getTime()) / 1000),
              };
            } else if (timer.state === 'resting' && timer.restStart) {
              updated[exerciseIndex][setIndex] = {
                ...timer,
                restTime: Math.floor((now.getTime() - timer.restStart.getTime()) / 1000),
              };
            }
          });
        });

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Inicializar tempo de início do exercício atual
  useEffect(() => {
    if (workout && !exerciseStartTimes[currentExerciseIndex]) {
      setExerciseStartTimes(prev => ({
        ...prev,
        [currentExerciseIndex]: new Date(),
      }));
    }
  }, [currentExerciseIndex, workout, exerciseStartTimes]);

  // Funções para controlar cronômetros de séries
  const handleStartSet = (setIndex: number) => {
    setSetTimers(prev => {
      const exerciseTimers = prev[currentExerciseIndex] || {};
      const timer = exerciseTimers[setIndex] || {
        executionStart: null,
        executionTime: 0,
        restStart: null,
        restTime: 0,
        state: 'idle' as const,
      };

      if (timer.state === 'idle') {
        return {
          ...prev,
          [currentExerciseIndex]: {
            ...exerciseTimers,
            [setIndex]: {
              ...timer,
              executionStart: new Date(),
              state: 'executing',
            },
          },
        };
      }
      return prev;
    });
  };

  const handleStartRest = (setIndex: number) => {
    setSetTimers(prev => {
      const exerciseTimers = prev[currentExerciseIndex] || {};
      const timer = exerciseTimers[setIndex];

      if (timer && timer.state === 'executing') {
        return {
          ...prev,
          [currentExerciseIndex]: {
            ...exerciseTimers,
            [setIndex]: {
              ...timer,
              restStart: new Date(),
              state: 'resting',
            },
          },
        };
      }
      return prev;
    });
  };

  const handleFinishRest = (setIndex: number) => {
    setSetTimers(prev => {
      const exerciseTimers = prev[currentExerciseIndex] || {};
      const timer = exerciseTimers[setIndex];

      if (timer && timer.state === 'resting') {
        return {
          ...prev,
          [currentExerciseIndex]: {
            ...exerciseTimers,
            [setIndex]: {
              ...timer,
              state: 'rest_complete',
            },
          },
        };
      }
      return prev;
    });
  };

  const handleNextExercise = () => {
    if (!workout) return;

    // Salvar tempo do exercício atual
    const exerciseStart = exerciseStartTimes[currentExerciseIndex];
    if (exerciseStart) {
      const exerciseTime = Math.floor((new Date().getTime() - exerciseStart.getTime()) / 1000);
      setValue(`exercises.${currentExerciseIndex}.exercise_time_seconds`, exerciseTime);
    }

    // Salvar tempos das séries no form
    const exerciseTimers = setTimers[currentExerciseIndex] || {};
    Object.keys(exerciseTimers).forEach(setIdx => {
      const setIndex = parseInt(setIdx);
      const timer = exerciseTimers[setIndex];
      if (timer) {
        setValue(`exercises.${currentExerciseIndex}.sets.${setIndex}.execution_time_seconds`, timer.executionTime);
        setValue(`exercises.${currentExerciseIndex}.sets.${setIndex}.rest_time_seconds`, timer.restTime);
      }
    });

    // Se não é o último exercício, mostrar tela de descanso
    if (currentExerciseIndex < workout.exercises.length - 1) {
      setIsRestingBetweenExercises(true);
      setRestStartTime(new Date());
      setRestElapsedTime(0);
    }
  };

  const handleStartNextExercise = () => {
    setIsRestingBetweenExercises(false);
    setRestStartTime(null);
    setRestElapsedTime(0);
    
    if (workout && currentExerciseIndex < workout.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  const handleFinishWorkout = async () => {
    if (!workout || !user || !initialized || !startTime) return;

    try {
      const performanceData = getValues('exercises');
      const today = new Date().toISOString().split('T')[0];
      const workoutDurationSeconds = elapsedTime; // Total workout time in seconds
      
      const logsToInsert = workout.exercises.map((exercise, index) => {
        // Calcular tempo total de descanso das séries
        const exerciseTimers = setTimers[index] || {};
        let totalRestTime = 0;
        Object.values(exerciseTimers).forEach(timer => {
          if (timer.restTime > 0) {
            totalRestTime += timer.restTime;
          }
        });

        // Se não houver tempos registrados, usar o valor padrão do exercício
        if (totalRestTime === 0) {
          const restMinutes = parseInt(exercise.rest) || 0;
          totalRestTime = restMinutes * 60;
        }

        // Preparar dados de performance com tempos
        const setsWithTimes = (performanceData[index]?.sets || []).map((set: any, setIdx: number) => {
          const timer = exerciseTimers[setIdx];
          return {
            weight: set.weight || '',
            reps: set.reps || '',
            execution_time_seconds: set.execution_time_seconds || timer?.executionTime || 0,
            rest_time_seconds: set.rest_time_seconds || timer?.restTime || 0,
          };
        });

        // Calcular tempo total do exercício (usar do form ou calcular)
        const exerciseTime = performanceData[index]?.exercise_time_seconds || 
          (exerciseStartTimes[index] 
            ? Math.floor((new Date().getTime() - exerciseStartTimes[index].getTime()) / 1000)
            : 0);

        return {
          user_id: user.id,
          exercise_name: exercise.name,
          log_date: today,
          performance: JSON.stringify(setsWithTimes),
          workout_duration_seconds: workoutDurationSeconds,
          rest_time_seconds: totalRestTime,
          workout_id: workoutId || '',
        };
      });

      await insert('workout_logs', logsToInsert);
      showSuccess('Treino concluído e salvo com sucesso!');
      setIsFinished(true);
    } catch (error) {
      showError('Erro ao salvar o registro do treino.');
      console.error(error);
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!workout) {
    return <p>Treino não encontrado.</p>;
  }

  if (isFinished) {
    return (
      <Card className="w-full max-w-2xl mx-auto text-center">
        <CardHeader>
          <PartyPopper className="mx-auto h-12 w-12 text-green-500" />
          <CardTitle className="text-2xl">Parabéns!</CardTitle>
          <CardDescription>Você concluiu o treino com sucesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-lg">Tempo total:</p>
          <Timer elapsedTime={elapsedTime} />
          <Button onClick={() => navigate('/dashboard')} className="mt-6">
            Voltar para o Painel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Tela de descanso entre exercícios
  if (isRestingBetweenExercises && workout) {
    const currentExercise = workout.exercises[currentExerciseIndex];
    const nextExercise = workout.exercises[currentExerciseIndex + 1];
    const restMinutes = currentExercise ? parseInt(currentExercise.rest) || 0 : 0;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" asChild size="sm" className="sm:h-auto">
            <NavLink to="/dashboard">
              <Home className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </NavLink>
          </Button>
        </div>
        <Card className="w-full max-w-2xl mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Clock className="h-6 w-6" />
              Tempo de Descanso
            </CardTitle>
            <CardDescription>
              Descanso recomendado: {restMinutes} minutos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Timer elapsedTime={restElapsedTime} size="xl" />
            {nextExercise && (
              <div className="pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-2">Próximo exercício:</p>
                <p className="text-xl font-semibold">{nextExercise.name}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {nextExercise.sets} séries × {nextExercise.reps}
                </p>
              </div>
            )}
            <Button 
              onClick={handleStartNextExercise}
              size="lg"
              className="mt-6 w-full sm:w-auto sm:min-w-[200px]"
            >
              <PlayCircle className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Iniciar Próximo Exercício</span>
              <span className="sm:hidden">Iniciar</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentExercise = workout.exercises[currentExerciseIndex];
  const totalSets = parseInt(currentExercise.sets, 10) || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" asChild>
          <NavLink to="/dashboard">
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </NavLink>
        </Button>
      </div>
      <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
            <CardTitle className="text-lg sm:text-xl">{workout.name}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Exercício {currentExerciseIndex + 1} de {workout.exercises.length}</CardDescription>
          </div>
          <Timer elapsedTime={elapsedTime} size="md" />
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div key={currentExerciseIndex}>
          {/* Header do exercício com botão de GIF */}
          <div className="mb-4 sm:mb-6 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 w-full">
                <h3 className="text-xl sm:text-2xl font-bold mb-1">{currentExercise.name}</h3>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <span>Séries: {currentExercise.sets}</span>
                  <span>Repetições: {currentExercise.reps}</span>
                  <span>Descanso: {currentExercise.rest}</span>
                </div>
              </div>
              {hasExerciseGif(currentExercise.name) && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setShowGif(true)}
                  className="bg-primary hover:bg-primary/90 shadow-lg w-full sm:w-auto"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Ver Execução
                </Button>
              )}
            </div>
            
            {hasExerciseGif(currentExercise.name) && (
              <Alert className="border-blue-500/50 bg-blue-500/5">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-sm">
                  Clique em "Ver Execução" para assistir a demonstração visual de como realizar este exercício corretamente.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: totalSets }).map((_, setIndex) => {
              const timer = setTimers[currentExerciseIndex]?.[setIndex] || {
                executionStart: null,
                executionTime: 0,
                restStart: null,
                restTime: 0,
                state: 'idle' as const,
              };

              const formatTime = (seconds: number) => {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${String(secs).padStart(2, '0')}`;
              };

              return (
                <div key={setIndex} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 text-primary font-bold text-sm sm:text-base">
                    {setIndex + 1}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`weight-${setIndex}`} className="text-xs sm:text-sm font-medium mb-1 block">
                      Peso (kg)
                    </Label>
                    <Input
                      id={`weight-${setIndex}`}
                      type="number"
                      placeholder="0"
                      step="0.5"
                      className="h-10 sm:h-11 text-sm sm:text-base"
                      {...control.register(`exercises.${currentExerciseIndex}.sets.${setIndex}.weight`)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor={`reps-${setIndex}`} className="text-xs sm:text-sm font-medium mb-1 block">
                      Repetições
                    </Label>
                    <Input
                      id={`reps-${setIndex}`}
                      type="number"
                      placeholder="0"
                      className="h-10 sm:h-11 text-sm sm:text-base"
                      {...control.register(`exercises.${currentExerciseIndex}.sets.${setIndex}.reps`)}
                    />
                  </div>
                  <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[140px]">
                    {timer.state === 'idle' && (
                      <Button
                        type="button"
                        onClick={() => handleStartSet(setIndex)}
                        size="sm"
                        variant="default"
                        className="w-full"
                      >
                        <Play className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Iniciar</span>
                      </Button>
                    )}
                    {timer.state === 'executing' && (
                      <>
                        <div className="text-xs text-center text-muted-foreground mb-1">
                          Execução: {formatTime(timer.executionTime)}
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleStartRest(setIndex)}
                          size="sm"
                          variant="secondary"
                          className="w-full"
                        >
                          <Pause className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Descansar</span>
                        </Button>
                      </>
                    )}
                    {timer.state === 'resting' && (
                      <>
                        <div className="text-xs text-center text-muted-foreground mb-1">
                          Descanso: {formatTime(timer.restTime)}
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleFinishRest(setIndex)}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          <CheckCircle className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Fim de Descanso</span>
                        </Button>
                      </>
                    )}
                    {timer.state === 'rest_complete' && (
                      <div className="text-xs text-center text-green-600">
                        ✓ Concluído
                        <br />
                        <span className="text-muted-foreground">
                          Ex: {formatTime(timer.executionTime)} | Desc: {formatTime(timer.restTime)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Progresso: {currentExerciseIndex + 1} de {workout.exercises.length} exercícios
            </div>
            {currentExerciseIndex < workout.exercises.length - 1 ? (
              <Button 
                type="button" 
                onClick={handleNextExercise}
                size="lg"
                className="min-w-[60px] sm:min-w-[180px]"
              >
                <span className="hidden sm:inline">Próximo Exercício </span>
                <ArrowRight className="h-5 w-5 sm:ml-2" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={handleFinishWorkout} 
                size="lg"
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto sm:min-w-[180px]"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizar Treino
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    
    {/* Dialog de GIF do exercício */}
    {workout && (
      <ExerciseGifDialog 
        isOpen={showGif}
        setIsOpen={setShowGif}
        exerciseName={currentExercise.name}
      />
    )}
    </div>
  );
};

export default WorkoutSessionPage;