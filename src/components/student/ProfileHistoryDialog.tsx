import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { History, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ProfileHistoryEntry = {
  id: string;
  user_id: string;
  height_cm?: number | string;
  weight_kg?: number | string;
  sex?: string;
  age?: number | string;
  routine?: string;
  locomotion_type?: string;
  locomotion_distance_km?: number | string;
  locomotion_time_minutes?: number | string;
  locomotion_days?: string[] | string;
  created_at: string;
};

const ProfileHistoryDialog = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
  const { user, profile } = useSession();
  const { select, update: updateHistory, delete: deleteHistory, initialized } = useGoogleSheetsDB();
  const [history, setHistory] = useState<ProfileHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProfileHistoryEntry>>({});

  const fetchHistory = async () => {
    if (!user || !initialized) {
      console.log('Cannot fetch history - user:', !!user, 'initialized:', initialized);
      return;
    }
    setLoading(true);
    try {
      // Use the profile ID (which matches what's in the sheet) instead of Google ID
      // This handles cases where the ID was truncated when saved
      const profileId = profile?.id || user.id;
      console.log('Fetching profile history for user:', user.id, 'using profile ID:', profileId, '(type:', typeof profileId, ')');
      
      // Try multiple ID formats to find matches
      let data: ProfileHistoryEntry[] = [];
      
      // First try with the profile ID (as string)
      data = await select<ProfileHistoryEntry>('profile_history', {
        eq: { column: 'user_id', value: String(profileId) },
        order: { column: 'created_at', ascending: false },
      });
      
      // If no results, try with Google ID
      if (data.length === 0 && String(profileId) !== String(user.id)) {
        console.log('No results with profile ID, trying Google ID:', user.id);
        data = await select<ProfileHistoryEntry>('profile_history', {
          eq: { column: 'user_id', value: String(user.id) },
          order: { column: 'created_at', ascending: false },
        });
      }
      
      // If still no results, try with numeric comparison (for truncated IDs)
      if (data.length === 0) {
        console.log('No results with string IDs, trying numeric comparison');
        const allHistory = await select<ProfileHistoryEntry>('profile_history', {
          order: { column: 'created_at', ascending: false },
        });
        // Filter manually to handle number/string mismatches
        data = allHistory.filter(entry => {
          const entryUserId = String(entry.user_id || '');
          const searchId = String(profileId || user.id || '');
          // Try exact match first
          if (entryUserId === searchId) return true;
          // Try numeric comparison (for truncated IDs)
          const entryNum = Number(entryUserId);
          const searchNum = Number(searchId);
          if (!isNaN(entryNum) && !isNaN(searchNum)) {
            // Check if they're close (within reasonable range for truncation)
            return Math.abs(entryNum - searchNum) < 1000;
          }
          return false;
        });
      }
      
      console.log('Profile history data received:', data.length, 'entries');
      
      // Parse locomotion_days if it's a string
      const parsedData = data.map(entry => {
        if (entry.locomotion_days && typeof entry.locomotion_days === 'string') {
          try {
            entry.locomotion_days = JSON.parse(entry.locomotion_days);
          } catch {
            entry.locomotion_days = [];
          }
        }
        return entry;
      });
      
      console.log('Parsed history data:', parsedData);
      setHistory(parsedData);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      showError(error.message || 'Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialized && user) {
      fetchHistory();
    }
  }, [isOpen, initialized, user, profile]);

  const handleEdit = (entry: ProfileHistoryEntry) => {
    setEditingId(entry.id);
    setEditForm({
      height_cm: entry.height_cm,
      weight_kg: entry.weight_kg,
      sex: entry.sex,
      age: entry.age,
      routine: entry.routine,
      locomotion_type: entry.locomotion_type,
      locomotion_distance_km: entry.locomotion_distance_km,
      locomotion_time_minutes: entry.locomotion_time_minutes,
      locomotion_days: entry.locomotion_days,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateHistory('profile_history', editForm, { column: 'id', value: editingId });
      showSuccess('Registro atualizado com sucesso!');
      setEditingId(null);
      setEditForm({});
      await fetchHistory();
    } catch (error: any) {
      showError(error.message || 'Erro ao atualizar registro.');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteHistory('profile_history', { column: 'id', value: deletingId });
      showSuccess('Registro excluído com sucesso!');
      setDeletingId(null);
      await fetchHistory();
    } catch (error: any) {
      showError(error.message || 'Erro ao excluir registro.');
      console.error(error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatLocomotionDays = (days: string[] | string | undefined) => {
    if (!days) return '-';
    if (typeof days === 'string') {
      try {
        const parsed = JSON.parse(days);
        return Array.isArray(parsed) ? parsed.join(', ') : days;
      } catch {
        return days;
      }
    }
    return Array.isArray(days) ? days.join(', ') : '-';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Dados Pessoais
            </DialogTitle>
            <DialogDescription>
              Visualize, edite ou exclua seus registros históricos de dados pessoais.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum registro histórico encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Altura (cm)</TableHead>
                    <TableHead>Peso (kg)</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Rotina</TableHead>
                    <TableHead>Locomoção</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      {editingId === entry.id ? (
                        <>
                          <TableCell>{formatDate(entry.created_at)}</TableCell>
                          <TableCell>
                            <input
                              type="number"
                              value={editForm.height_cm || ''}
                              onChange={(e) => setEditForm({ ...editForm, height_cm: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-20 px-2 py-1 border rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              value={editForm.weight_kg || ''}
                              onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-20 px-2 py-1 border rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              value={editForm.sex || ''}
                              onChange={(e) => setEditForm({ ...editForm, sex: e.target.value || undefined })}
                              className="px-2 py-1 border rounded"
                            >
                              <option value="">-</option>
                              <option value="Masculino">Masculino</option>
                              <option value="Feminino">Feminino</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <input
                              type="number"
                              value={editForm.age || ''}
                              onChange={(e) => setEditForm({ ...editForm, age: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-16 px-2 py-1 border rounded"
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              value={editForm.routine || ''}
                              onChange={(e) => setEditForm({ ...editForm, routine: e.target.value || undefined })}
                              className="px-2 py-1 border rounded"
                            >
                              <option value="">-</option>
                              <option value="Sedentária">Sedentária</option>
                              <option value="Ativa">Ativa</option>
                              <option value="Atleta">Atleta</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <select
                              value={editForm.locomotion_type || ''}
                              onChange={(e) => setEditForm({ ...editForm, locomotion_type: e.target.value || undefined })}
                              className="px-2 py-1 border rounded"
                            >
                              <option value="">-</option>
                              <option value="Caminha">Caminha</option>
                              <option value="Corre">Corre</option>
                              <option value="Bicicleta">Bicicleta</option>
                              <option value="Carro">Carro</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEdit}>Salvar</Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditForm({}); }}>Cancelar</Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{formatDate(entry.created_at)}</TableCell>
                          <TableCell>{entry.height_cm || '-'}</TableCell>
                          <TableCell>{entry.weight_kg || '-'}</TableCell>
                          <TableCell>{entry.sex || '-'}</TableCell>
                          <TableCell>{entry.age || '-'}</TableCell>
                          <TableCell>{entry.routine || '-'}</TableCell>
                          <TableCell>
                            {entry.locomotion_type ? `${entry.locomotion_type}${entry.locomotion_distance_km ? ` (${entry.locomotion_distance_km}km)` : ''}` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setDeletingId(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro do histórico? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfileHistoryDialog;

