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
import { Textarea } from '@/components/ui/textarea';
import { showError, showSuccess } from '@/utils/toast';
import { useSession } from '@/contexts/SessionContext';

const emptyStringToNull = z.preprocess(
  (val) => (val === "" ? null : val),
  z.coerce.number().positive('Deve ser um número positivo.').nullable().optional()
);

const bioimpedanceSchema = z.object({
  record_date: z.string().min(1, 'Data é obrigatória.'),
  weight_kg: emptyStringToNull,
  body_fat_percentage: emptyStringToNull,
  muscle_mass_kg: emptyStringToNull,
  water_percentage: emptyStringToNull,
  notes: z.string().optional(),
});

type BioimpedanceFormData = z.infer<typeof bioimpedanceSchema>;

const AddBioimpedanceDialog = ({ isOpen, setIsOpen, onRecordAdded }: { isOpen: boolean; setIsOpen: (open: boolean) => void; onRecordAdded: () => void }) => {
  const { user } = useSession();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BioimpedanceFormData>({
    resolver: zodResolver(bioimpedanceSchema),
    defaultValues: {
      record_date: new Date().toISOString().split('T')[0], // Default to today's date
    },
  });

  const onSubmit = async (data: BioimpedanceFormData) => {
    if (!user) {
      showError('Usuário não autenticado.');
      return;
    }

    const { error } = await supabase.from('bioimpedance_records').insert([{ user_id: user.id, ...data }]);

    if (error) {
      showError('Erro ao adicionar registro de bioimpedância.');
      console.error(error);
    } else {
      showSuccess('Registro de bioimpedância adicionado com sucesso!');
      onRecordAdded();
      reset({
        record_date: new Date().toISOString().split('T')[0],
        weight_kg: undefined,
        body_fat_percentage: undefined,
        muscle_mass_kg: undefined,
        water_percentage: undefined,
        notes: '',
      });
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Registro de Bioimpedância</DialogTitle>
          <DialogDescription>
            Preencha os dados da sua medição de bioimpedância.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div>
            <Label htmlFor="record_date">Data do Registro</Label>
            <Input id="record_date" type="date" {...register('record_date')} />
            {errors.record_date && <p className="text-red-500 text-sm mt-1">{errors.record_date.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input id="weight_kg" type="number" step="0.1" {...register('weight_kg')} />
              {errors.weight_kg && <p className="text-red-500 text-sm mt-1">{errors.weight_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="body_fat_percentage">Percentual de Gordura (%)</Label>
              <Input id="body_fat_percentage" type="number" step="0.1" {...register('body_fat_percentage')} />
              {errors.body_fat_percentage && <p className="text-red-500 text-sm mt-1">{errors.body_fat_percentage.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="muscle_mass_kg">Massa Muscular (kg)</Label>
              <Input id="muscle_mass_kg" type="number" step="0.1" {...register('muscle_mass_kg')} />
              {errors.muscle_mass_kg && <p className="text-red-500 text-sm mt-1">{errors.muscle_mass_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="water_percentage">Percentual de Água (%)</Label>
              <Input id="water_percentage" type="number" step="0.1" {...register('water_percentage')} />
              {errors.water_percentage && <p className="text-red-500 text-sm mt-1">{errors.water_percentage.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...register('notes')} />
            {errors.notes && <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBioimpedanceDialog;