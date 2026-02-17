import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit2, Trash2, Save, X } from 'lucide-react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { useSession } from '@/contexts/SessionContext';
import { showSuccess, showError } from '@/utils/toast';

type WeightEntry = {
  id: number | string;
  weight_kg: number;
  created_at: string;
};

const WeightHistoryList = ({ data, onUpdate }: { data: WeightEntry[]; onUpdate?: () => void }) => {
  const { user, profile } = useSession();
  const { update, delete: deleteWeight, initialized, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingWeight, setEditingWeight] = useState<number | string>('');
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedData = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const isLastEntry = sortedData.length === 1;

  const handleEdit = (entry: WeightEntry) => {
    setEditingId(entry.id);
    setEditingWeight(entry.weight_kg);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingWeight('');
  };

  const handleSaveEdit = async () => {
    if (!user || !initialized || editingId === null) return;

    const weightValue = typeof editingWeight === 'string' ? parseFloat(editingWeight) : editingWeight;
    
    if (isNaN(weightValue) || weightValue <= 0) {
      showError('Peso inválido. Digite um valor positivo.');
      return;
    }

    try {
      const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);

      await update('weight_history', {
        weight_kg: weightValue,
      }, {
        column: 'id',
        value: editingId
      });

      // Se for o registro mais recente, atualizar também o perfil
      const entry = sortedData.find(e => e.id === editingId);
      if (entry && sortedData[0].id === editingId) {
        try {
          await update('profiles', {
            weight_kg: weightValue,
          }, {
            column: 'id',
            value: userId
          });
          
          // Disparar evento para atualizar perfil
          window.dispatchEvent(new CustomEvent('profileUpdated'));
        } catch (profileError) {
          console.warn('Erro ao atualizar perfil:', profileError);
        }
      }

      showSuccess('Peso atualizado com sucesso!');
      setEditingId(null);
      setEditingWeight('');
      
      // Disparar evento para atualizar componentes
      window.dispatchEvent(new CustomEvent('weightAdded'));
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      showError('Erro ao atualizar peso.');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!user || !initialized || deletingId === null) return;

    // Verificar se é o último registro
    if (isLastEntry) {
      showError('Não é possível deletar o último registro. É necessário manter pelo menos um peso para o gráfico funcionar.');
      setDeletingId(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWeight('weight_history', {
        column: 'id',
        value: deletingId
      });

      showSuccess('Peso deletado com sucesso!');
      setDeletingId(null);
      
      // Disparar evento para atualizar componentes
      window.dispatchEvent(new CustomEvent('weightAdded'));
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      showError('Erro ao deletar peso.');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Peso</CardTitle>
          <CardDescription>
            Todos os seus registros de peso. Você pode editar ou deletar registros, mas deve manter pelo menos um registro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                    <TableCell className="text-right">
                      {editingId === entry.id ? (
                        <Input
                          type="number"
                          step="0.1"
                          value={editingWeight}
                          onChange={(e) => setEditingWeight(e.target.value)}
                          className="w-24 ml-auto"
                          autoFocus
                        />
                      ) : (
                        <span className="font-medium">{entry.weight_kg} kg</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === entry.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleSaveEdit}
                            className="h-8 w-8 p-0"
                          >
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(entry)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingId(entry.id)}
                            disabled={isLastEntry}
                            className="h-8 w-8 p-0"
                            title={isLastEntry ? 'Não é possível deletar o último registro' : 'Deletar'}
                          >
                            <Trash2 className={`h-4 w-4 ${isLastEntry ? 'text-muted-foreground' : 'text-red-600'}`} />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground">Nenhum registro de peso encontrado.</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este registro de peso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default WeightHistoryList;