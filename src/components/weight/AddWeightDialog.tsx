import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';

const weightSchema = z.object({
  weight_kg: z.coerce.number().positive('Peso deve ser positivo.').min(1, 'Peso é obrigatório.'),
});

type WeightFormData = z.infer<typeof weightSchema>;

const AddWeightDialog = ({ isOpen, setIsOpen, onWeightAdded }: { isOpen: boolean; setIsOpen: (open: boolean) => void; onWeightAdded: () => void }) => {
  const { user, profile } = useSession();
  const { insert, update, select, initialized, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WeightFormData>({
    resolver: zodResolver(weightSchema),
  });

  const onSubmit = async (data: WeightFormData) => {
    if (!user || !initialized) {
      showError('Usuário não autenticado ou banco de dados não inicializado.');
      return;
    }

    try {
      // Determinar user_id correto (considerando planilhas compartilhadas)
      const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);

      // 1. Adicionar ao histórico de peso
      await insert('weight_history', {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        weight_kg: data.weight_kg,
        created_at: new Date().toISOString(),
      });

      // 2. Atualizar peso no perfil (sincronização bilateral)
      try {
        const existingProfiles = await select<{ id: string }>('profiles', {
          eq: { column: 'id', value: userId }
        });

        if (existingProfiles.length > 0) {
          // Atualizar perfil existente
          await update('profiles', {
            weight_kg: data.weight_kg,
          }, {
            column: 'id',
            value: userId
          });
          console.log('AddWeightDialog: Perfil atualizado com novo peso');
        } else if (profile) {
          // Criar perfil se não existir (caso raro)
          await insert('profiles', {
            id: userId,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            role: profile.role || 'student',
            email: user.email,
            weight_kg: data.weight_kg,
          });
          console.log('AddWeightDialog: Perfil criado com novo peso');
        }

        // Disparar eventos para atualizar perfil no SessionContext e componentes
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        window.dispatchEvent(new CustomEvent('weightAdded'));
      } catch (profileError) {
        console.error('AddWeightDialog: Erro ao atualizar perfil:', profileError);
        // Não bloquear se falhar atualizar perfil, o histórico já foi salvo
      }

      showSuccess('Peso adicionado e perfil atualizado com sucesso!');
      onWeightAdded();
      reset();
      setIsOpen(false);
    } catch (error) {
      showError('Erro ao adicionar peso.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Peso</DialogTitle>
          <DialogDescription>
            Registre seu peso atual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight_kg" className="text-right">
              Peso (kg)
            </Label>
            <Input id="weight_kg" type="number" step="0.1" {...register('weight_kg')} className="col-span-3" />
            {errors.weight_kg && <p className="col-span-4 text-red-500 text-sm text-right">{errors.weight_kg.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Peso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWeightDialog;