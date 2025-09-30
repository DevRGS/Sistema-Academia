import { useForm, Controller } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from '@/utils/toast';

const mealSchema = z.object({
  meal: z.enum(['Café da Manhã', 'Lanche da Manhã', 'Almoço', 'Lanche da Tarde', 'Jantar', 'Ceia'], {
    required_error: "Selecione um tipo de refeição."
  }),
  description: z.string().min(1, 'Descrição é obrigatória.'),
  scheduled_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM).'),
  calories: z.coerce.number().optional(),
  protein_g: z.coerce.number().optional(),
  carbs_g: z.coerce.number().optional(),
  fat_g: z.coerce.number().optional(),
});

type MealFormData = z.infer<typeof mealSchema>;

const AddMealDialog = ({ isOpen, setIsOpen, studentId, onMealAdded }) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MealFormData>({
    resolver: zodResolver(mealSchema),
  });

  const onSubmit = async (data: MealFormData) => {
    if (!studentId) return;

    const { error } = await supabase.from('diet_plans').insert([{ ...data, user_id: studentId }]);

    if (error) {
      showError('Erro ao adicionar refeição.');
      console.error(error);
    } else {
      showSuccess('Refeição adicionada com sucesso!');
      onMealAdded();
      reset();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Refeição</DialogTitle>
          <DialogDescription>
            Preencha os detalhes da refeição para o aluno selecionado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Refeição</Label>
              <Controller
                control={control}
                name="meal"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a refeição" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Café da Manhã">Café da Manhã</SelectItem>
                      <SelectItem value="Lanche da Manhã">Lanche da Manhã</SelectItem>
                      <SelectItem value="Almoço">Almoço</SelectItem>
                      <SelectItem value="Lanche da Tarde">Lanche da Tarde</SelectItem>
                      <SelectItem value="Jantar">Jantar</SelectItem>
                      <SelectItem value="Ceia">Ceia</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.meal && <p className="text-red-500 text-sm mt-1">{errors.meal.message}</p>}
            </div>
            <div>
              <Label htmlFor="scheduled_time">Horário (HH:MM)</Label>
              <Input id="scheduled_time" {...register('scheduled_time')} />
              {errors.scheduled_time && <p className="text-red-500 text-sm mt-1">{errors.scheduled_time.message}</p>}
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...register('description')} />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div><Label>Calorias</Label><Input type="number" {...register('calories')} /></div>
            <div><Label>Proteínas (g)</Label><Input type="number" {...register('protein_g')} /></div>
            <div><Label>Carbs (g)</Label><Input type="number" {...register('carbs_g')} /></div>
            <div><Label>Gorduras (g)</Label><Input type="number" {...register('fat_g')} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Refeição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMealDialog;