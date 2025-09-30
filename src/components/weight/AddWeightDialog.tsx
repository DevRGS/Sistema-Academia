import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
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

const weightSchema = z.object({
  weight_kg: z.coerce.number().positive('Peso deve ser positivo.').min(1, 'Peso é obrigatório.'),
});

type WeightFormData = z.infer<typeof weightSchema>;

const AddWeightDialog = ({ isOpen, setIsOpen, onWeightAdded }: { isOpen: boolean; setIsOpen: (open: boolean) => void; onWeightAdded: () => void }) => {
  const { user } = useSession();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WeightFormData>({
    resolver: zodResolver(weightSchema),
  });

  const onSubmit = async (data: WeightFormData) => {
    if (!user) {
      showError('Usuário não autenticado.');
      return;
    }

    const { error } = await supabase.from('weight_history').insert([{ user_id: user.id, weight_kg: data.weight_kg }]);

    if (error) {
      showError('Erro ao adicionar peso.');
      console.error(error);
    } else {
      showSuccess('Peso adicionado com sucesso!');
      onWeightAdded();
      reset();
      setIsOpen(false);
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