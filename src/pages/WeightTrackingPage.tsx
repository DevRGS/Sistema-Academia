import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Home } from 'lucide-react';
import AddWeightDialog from '@/components/weight/AddWeightDialog';
import WeightChart from '@/components/weight/WeightChart';
import WeightHistoryList from '@/components/weight/WeightHistoryList';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Scale } from 'lucide-react';

export type WeightEntry = {
  id: number;
  user_id: string;
  weight_kg: number;
  created_at: string;
};

const WeightTrackingPage = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddWeightDialogOpen, setIsAddWeightDialogOpen] = useState(false);

  const fetchWeightHistory = async () => {
    if (!user || !initialized) return;
    setLoading(true);
    try {
      // If viewing a shared spreadsheet (not own), use profile.id (which will be the student's ID)
      // Otherwise, use user.id (the full Google ID) to avoid truncation issues
      const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
      
      const data = await select<WeightEntry>('weight_history', {
        eq: { column: 'user_id', value: userId },
        order: { column: 'created_at', ascending: false },
      });
      setWeightHistory(data);
    } catch (error) {
      console.error('Error fetching weight history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && !dbLoading && user && initialized) {
      fetchWeightHistory();
    }
  }, [user, profile, sessionLoading, dbLoading, initialized, spreadsheetId]);

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Alert>
        <Scale className="h-4 w-4" />
        <AlertTitle>Erro de Autenticação</AlertTitle>
        <AlertDescription>
          Você precisa estar logado para acessar o histórico de peso.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Meu Peso</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild size="sm" className="sm:h-auto">
            <NavLink to="/dashboard">
              <Home className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </NavLink>
          </Button>
          <Button onClick={() => setIsAddWeightDialogOpen(true)} size="sm" className="flex-1 sm:flex-initial">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Peso
          </Button>
        </div>
      </div>

      <AddWeightDialog
        isOpen={isAddWeightDialogOpen}
        setIsOpen={setIsAddWeightDialogOpen}
        onWeightAdded={fetchWeightHistory}
      />

      <WeightChart data={weightHistory} />
      <WeightHistoryList data={weightHistory} onUpdate={fetchWeightHistory} />
    </div>
  );
};

export default WeightTrackingPage;