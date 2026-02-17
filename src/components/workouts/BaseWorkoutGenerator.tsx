import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateWorkouts, type WorkoutTemplate } from '@/utils/workoutGenerator';
import { loadLimitations, MUSCLE_GROUPS } from '@/utils/exerciseService';
import { showSuccess, showError } from '@/utils/toast';
import type { MuscleGroupFocus } from '@/utils/exerciseService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const BaseWorkoutGenerator = ({ onWorkoutsGenerated }: { onWorkoutsGenerated: () => void }) => {
  const { user, profile } = useSession();
  const { select, insert, initialized, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [workoutType, setWorkoutType] = useState<'abc' | 'beginner' | 'intermediate' | 'advanced' | 'custom'>('abc');
  const [customFocus, setCustomFocus] = useState<MuscleGroupFocus>({});
  const [generating, setGenerating] = useState(false);
  const [userLimitations, setUserLimitations] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const loadUserLimitations = async () => {
      if (!user || !initialized) return;
      
      try {
        const profiles = await select<{ limitations?: string }>('profiles', {
          eq: { column: 'id', value: user.id }
        });
        
        if (profiles.length > 0 && profiles[0].limitations) {
          try {
            const saved = typeof profiles[0].limitations === 'string' 
              ? JSON.parse(profiles[0].limitations)
              : profiles[0].limitations;
            setUserLimitations(saved || {});
          } catch {
            setUserLimitations({});
          }
        }
      } catch (error) {
        console.error('Erro ao carregar limitações:', error);
      }
    };
    
    loadUserLimitations();
  }, [user, initialized, select]);

  const handleGenerate = async () => {
    if (!user || !initialized) return;
    
    setGenerating(true);
    try {
      const limitations = await loadLimitations();
      const workouts = await generateWorkouts(
        workoutType,
        userLimitations,
        limitations,
        workoutType === 'custom' ? customFocus : undefined
      );
      
      // Salvar treinos no banco
      const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
      
      // Importar função para inicializar treinos com datas
      const { initializeWorkoutWithDates, DEFAULT_ADAPTATION_PERIOD_DAYS } = await import('@/utils/workoutExpirationService');
      
      for (const workout of workouts) {
        const workoutWithDates = initializeWorkoutWithDates({
          user_id: userId,
          name: workout.name,
          muscle_group: workout.muscle_group,
          exercises: JSON.stringify(workout.exercises),
          created_at: new Date().toISOString(),
        }, DEFAULT_ADAPTATION_PERIOD_DAYS);
        
        await insert('workouts', workoutWithDates);
      }
      
      showSuccess(`${workouts.length} treinos gerados com sucesso!`);
      onWorkoutsGenerated();
    } catch (error: any) {
      showError(error.message || 'Erro ao gerar treinos.');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const updateCustomFocus = (group: string, value: number) => {
    setCustomFocus(prev => ({
      ...prev,
      [group]: Math.max(0, Math.min(100, value || 0)),
    }));
  };

  const totalPercentage = Object.values(customFocus).reduce((sum, val) => sum + val, 0);
  const isValidCustom = workoutType !== 'custom' || totalPercentage === 100;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Gerar Treinos Base</CardTitle>
        <CardDescription>
          Escolha um tipo de treino para gerar automaticamente baseado nas suas limitações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tipo de Treino</Label>
          <Select value={workoutType} onValueChange={(value: any) => setWorkoutType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abc">Treino ABC</SelectItem>
              <SelectItem value="beginner">Treino Inicial</SelectItem>
              <SelectItem value="intermediate">Treino Intermediário</SelectItem>
              <SelectItem value="advanced">Treino Avançado</SelectItem>
              <SelectItem value="custom">Treino Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {workoutType === 'custom' && (
          <div className="space-y-3 p-4 border rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <Label className="font-semibold">Distribuição de Foco (%)</Label>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Total: <strong>{totalPercentage}%</strong> {totalPercentage !== 100 && '(deve somar 100%)'}
              </AlertDescription>
            </Alert>
            {Object.keys(MUSCLE_GROUPS).map(group => (
              <div key={group} className="flex items-center gap-2">
                <Label className="w-32">{group}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={customFocus[group] || 0}
                  onChange={(e) => updateCustomFocus(group, Number(e.target.value) || 0)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            ))}
          </div>
        )}

        <Button 
          onClick={handleGenerate} 
          disabled={generating || !isValidCustom}
          className="w-full"
        >
          {generating ? 'Gerando...' : 'Gerar Treinos'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BaseWorkoutGenerator;

