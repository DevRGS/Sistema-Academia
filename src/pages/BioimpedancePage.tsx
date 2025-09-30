import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import AddBioimpedanceDialog from '@/components/bioimpedance/AddBioimpedanceDialog';
import BioimpedanceChart from '@/components/bioimpedance/BioimpedanceChart';
import BioimpedanceHistoryList from '@/components/bioimpedance/BioimpedanceHistoryList';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart } from 'lucide-react';

export type BioimpedanceRecord = {
  id: number;
  user_id: string;
  record_date: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  water_percentage: number | null;
  notes: string | null;
  created_at: string;
};

const BioimpedancePage = () => {
  const { user, loading: sessionLoading } = useSession();
  const [bioimpedanceHistory, setBioimpedanceHistory] = useState<BioimpedanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);

  const fetchBioimpedanceHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('bioimpedance_records')
      .select('*')
      .eq('user_id', user.id)
      .order('record_date', { ascending: false }); // Order by most recent date first

    if (error) {
      console.error('Error fetching bioimpedance history:', error);
    } else if (data) {
      setBioimpedanceHistory(data as BioimpedanceRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!sessionLoading && user) {
      fetchBioimpedanceHistory();
    }
  }, [user, sessionLoading]);

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Alert>
        <LineChart className="h-4 w-4" />
        <AlertTitle>Erro de Autenticação</AlertTitle>
        <AlertDescription>
          Você precisa estar logado para acessar o histórico de bioimpedância.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Minha Bioimpedância</h1>
        <Button onClick={() => setIsAddRecordDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Registro
        </Button>
      </div>

      <AddBioimpedanceDialog
        isOpen={isAddRecordDialogOpen}
        setIsOpen={setIsAddRecordDialogOpen}
        onRecordAdded={fetchBioimpedanceHistory}
      />

      <BioimpedanceChart data={bioimpedanceHistory} />
      <BioimpedanceHistoryList data={bioimpedanceHistory} />
    </div>
  );
};

export default BioimpedancePage;