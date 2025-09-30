import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import AddWorkoutDialog from '@/components/workouts/AddWorkoutDialog';
import WorkoutList from '@/components/workouts/WorkoutList';
import { useSession } from '@/contexts/SessionContext';

export type Exercise = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
};

export type Workout = {
  id: number;
  user_id: string;
  name: string;
  muscle_group: string;
  exercises: Exercise[];
  created_at: string;
};

const WorkoutsPage = () => {
  const { profile } = useSession();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchWorkouts = async () => {
    setLoading(true);
    // RLS policies will automatically filter workouts:
    // Admins see all, students see only their own.
    const { data, error } = await supabase.from('workouts').select('*').order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workouts:', error);
    } else if (data) {
      setWorkouts(data as Workout[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Treinos</h1>
        {profile?.role === 'admin' && (
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Treino
          </Button>
        )}
      </div>
      
      {profile?.role === 'admin' && (
        <AddWorkoutDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onWorkoutAdded={fetchWorkouts}
        />
      )}

      {loading ? (
        <p>Carregando treinos...</p>
      ) : (
        <WorkoutList workouts={workouts} />
      )}
    </div>
  );
};

export default WorkoutsPage;