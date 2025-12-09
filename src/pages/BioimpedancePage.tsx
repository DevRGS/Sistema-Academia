import { useState, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle, Home } from 'lucide-react';
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
  // New fields
  waist_cm: number | null;
  hip_cm: number | null;
  glutes_cm: number | null;
  thigh_cm: number | null;
  calf_cm: number | null;
  biceps_cm: number | null;
  forearm_cm: number | null;
  chest_cm: number | null;
  shoulders_cm: number | null;
  bmi: number | null;
  fat_mass_kg: number | null;
  lean_mass_kg: number | null;
  segmental_muscle_mass_arms_kg: number | null;
  segmental_muscle_mass_legs_kg: number | null;
  segmental_muscle_mass_trunk_kg: number | null;
  total_body_water_percentage: number | null;
  intracellular_water_percentage: number | null;
  extracellular_water_percentage: number | null;
  basal_metabolic_rate_kcal: number | null;
  visceral_fat_level: number | null;
  metabolic_age: number | null;
};

const BioimpedancePage = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [bioimpedanceHistory, setBioimpedanceHistory] = useState<BioimpedanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddRecordDialogOpen, setIsAddRecordDialogOpen] = useState(false);

  const fetchBioimpedanceHistory = async () => {
    if (!user || !initialized) return;
    setLoading(true);
    try {
      // If viewing a shared spreadsheet (not own), use profile.id (which will be the student's ID)
      // Otherwise, use user.id (the full Google ID) to avoid truncation issues
      const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
      
      const data = await select<BioimpedanceRecord>('bioimpedance_records', {
        eq: { column: 'user_id', value: userId },
        order: { column: 'record_date', ascending: false },
      });
      setBioimpedanceHistory(data);
    } catch (error) {
      console.error('Error fetching bioimpedance history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && !dbLoading && user && initialized) {
      fetchBioimpedanceHistory();
    }
  }, [user, profile, sessionLoading, dbLoading, initialized, spreadsheetId]);

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
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <NavLink to="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Dashboard
            </NavLink>
          </Button>
          <Button onClick={() => setIsAddRecordDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Registro
          </Button>
        </div>
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