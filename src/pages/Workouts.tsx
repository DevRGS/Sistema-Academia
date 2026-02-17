import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Home } from 'lucide-react';
import AddWorkoutDialog from '@/components/workouts/AddWorkoutDialog';
import WorkoutList from '@/components/workouts/WorkoutList';
import BaseWorkoutGenerator from '@/components/workouts/BaseWorkoutGenerator';
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
  start_date?: string;
  expiration_date?: string;
  status?: 'ativo' | 'expirado' | 'substituído';
  adaptation_period_days?: number;
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
    <div className="container mx-auto p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Treinos</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild size="sm" className="sm:hidden">
            <NavLink to="/dashboard">
              <Home className="h-4 w-4" />
            </NavLink>
          </Button>
          <Button variant="outline" asChild className="hidden sm:flex">
            <NavLink to="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </NavLink>
          </Button>
          {(profile?.role === 'admin' || profile?.role === 'student' || profile?.role === 'personal') && (
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="flex-1 sm:flex-initial">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Treino
            </Button>
          )}
        </div>
      </div>
      
      <BaseWorkoutGenerator onWorkoutsGenerated={fetchWorkouts} />
      
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