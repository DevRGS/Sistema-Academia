import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Workout } from './Workouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import Timer from '@/components/workouts/Timer';
import { showError, showSuccess } from '@/utils/toast';
import { CheckCircle, PartyPopper } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

type PerformanceData = {
  sets: {
    reps: string;
    weight: string;
  }[];
};

type FormData = {
  exercises: PerformanceData[];
};

const WorkoutSessionPage = () => {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const { control, getValues } = useForm<FormData>({
    defaultValues: {
      exercises: [],
    },
  });

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!workoutId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (error) {
        showError('Erro ao carregar o treino.');
        navigate('/workouts');
      } else {
        setWorkout(data as Workout);
        setStartTime(new Date());
      }
      setLoading(false);
    };
    fetchWorkout();
  }, [workoutId, navigate]);

  useEffect(() => {
    if (!startTime || isFinished) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isFinished]);

  const handleNextExercise = () => {
    if (workout && currentExerciseIndex < workout.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    }
  };

  const handleFinishWorkout = async () => {
    if (!workout || !user) return;

    const performanceData = getValues('exercises');
    const logsToInsert = workout.exercises.map((exercise, index) => ({
      user_id: user.id,
      exercise_name: exercise.name,
      performance: performanceData[index]?.sets || [],
    }));

    const { error } = await supabase.from('workout_logs').insert(logsToInsert);

    if (error) {
      showError('Erro ao salvar o registro do treino.');
      console.error(error);
    } else {
      showSuccess('Treino concluído e salvo com sucesso!');
      setIsFinished(true);
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

  const currentExercise = workout.exercises[currentExerciseIndex];
  const totalSets = parseInt(currentExercise.sets, 10) || 0;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{workout.name}</CardTitle>
            <CardDescription>Exercício {currentExerciseIndex + 1} de {workout.exercises.length}</CardDescription>
          </div>
          <Timer elapsedTime={elapsedTime} />
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-xl font-semibold mb-4">{currentExercise.name}</h3>
          <div className="space-y-4">
            {Array.from({ length: totalSets }).map((_, setIndex) => (
              <div key={setIndex} className="flex items-center gap-4 p-2 border rounded-md">
                <Label className="w-16">Série {setIndex + 1}</Label>
                <div className="flex-1">
                  <Label htmlFor={`weight-${setIndex}`} className="text-xs">Peso (kg)</Label>
                  <Input
                    id={`weight-${setIndex}`}
                    type="number"
                    placeholder="0"
                    {...control.register(`exercises.${currentExerciseIndex}.sets.${setIndex}.weight`)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`reps-${setIndex}`} className="text-xs">Repetições</Label>
                  <Input
                    id={`reps-${setIndex}`}
                    type="number"
                    placeholder="0"
                    {...control.register(`exercises.${currentExerciseIndex}.sets.${setIndex}.reps`)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-4">
            {currentExerciseIndex < workout.exercises.length - 1 ? (
              <Button type="button" onClick={handleNextExercise}>
                Próximo Exercício
              </Button>
            ) : (
              <Button type="button" onClick={handleFinishWorkout} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalizar Treino
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutSessionPage;