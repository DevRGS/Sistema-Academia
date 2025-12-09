import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Home } from 'lucide-react';
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
  const { profile, user } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchWorkouts = async () => {
    if (!initialized) return;
    setLoading(true);
    try {
      // Admins see all, others see only their own (or selected student's if viewing shared spreadsheet)
      const options: any = { order: { column: 'created_at', ascending: false } };
      if (profile?.role !== 'admin' && user) {
        // If viewing a shared spreadsheet (not own), use profile.id (which will be the student's ID)
        // Otherwise, use user.id (the full Google ID) to avoid truncation issues
        const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
        const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
        options.eq = { column: 'user_id', value: userId };
      }
      const data = await select<Workout>('workouts', options);
      // Parse exercises from JSON string to array
      const parsedData = data.map(workout => {
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
      setWorkouts(parsedData);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized && !dbLoading) {
      fetchWorkouts();
    }
  }, [initialized, dbLoading, profile, user, spreadsheetId]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Treinos</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <NavLink to="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </NavLink>
          </Button>
          {(profile?.role === 'admin' || profile?.role === 'student' || profile?.role === 'personal') && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Treino
            </Button>
          )}
        </div>
      </div>
      
      {(profile?.role === 'admin' || profile?.role === 'student' || profile?.role === 'personal') && (
        <AddWorkoutDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onWorkoutAdded={fetchWorkouts}
        />
      )}

      {loading ? (
        <p>Carregando treinos...</p>
      ) : (
        <WorkoutList workouts={workouts} onWorkoutUpdated={fetchWorkouts} />
      )}
    </div>
  );
};

export default WorkoutsPage;