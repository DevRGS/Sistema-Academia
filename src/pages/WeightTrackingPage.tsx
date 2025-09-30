import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
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
  const { user, loading: sessionLoading } = useSession();
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddWeightDialogOpen, setIsAddWeightDialogOpen] = useState(false);

  const fetchWeightHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('weight_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }); // Order by most recent first

    if (error) {
      console.error('Error fetching weight history:', error);
    } else if (data) {
      setWeightHistory(data as WeightEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!sessionLoading && user) {
      fetchWeightHistory();
    }
  }, [user, sessionLoading]);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Meu Peso</h1>
        <Button onClick={() => setIsAddWeightDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Peso
        </Button>
      </div>

      <AddWeightDialog
        isOpen={isAddWeightDialogOpen}
        setIsOpen={setIsAddWeightDialogOpen}
        onWeightAdded={fetchWeightHistory}
      />

      <WeightChart data={weightHistory} />
      <WeightHistoryList data={weightHistory} />
    </div>
  );
};

export default WeightTrackingPage;