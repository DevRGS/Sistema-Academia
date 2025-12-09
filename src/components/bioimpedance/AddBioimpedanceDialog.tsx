import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
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
  // New fields for anthropometry
  waist_cm: emptyStringToNull,
  hip_cm: emptyStringToNull,
  glutes_cm: emptyStringToNull,
  thigh_cm: emptyStringToNull,
  calf_cm: emptyStringToNull,
  biceps_cm: emptyStringToNull,
  forearm_cm: emptyStringToNull,
  chest_cm: emptyStringToNull,
  shoulders_cm: emptyStringToNull,
  // New fields for bioimpedance results (some can be auto-calculated)
  bmi: emptyStringToNull, // Can be auto-calculated
  fat_mass_kg: emptyStringToNull,
  lean_mass_kg: emptyStringToNull,
  segmental_muscle_mass_arms_kg: emptyStringToNull,
  segmental_muscle_mass_legs_kg: emptyStringToNull,
  segmental_muscle_mass_trunk_kg: emptyStringToNull,
  total_body_water_percentage: emptyStringToNull,
  intracellular_water_percentage: emptyStringToNull,
  extracellular_water_percentage: emptyStringToNull,
  basal_metabolic_rate_kcal: emptyStringToNull, // Can be auto-calculated
  visceral_fat_level: emptyStringToNull,
  metabolic_age: emptyStringToNull,
});

type BioimpedanceFormData = z.infer<typeof bioimpedanceSchema>;

const AddBioimpedanceDialog = ({ isOpen, setIsOpen, onRecordAdded }: { isOpen: boolean; setIsOpen: (open: boolean) => void; onRecordAdded: () => void }) => {
  const { user, profile } = useSession();
  const { insert, initialized } = useGoogleSheetsDB();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BioimpedanceFormData>({
    resolver: zodResolver(bioimpedanceSchema),
    defaultValues: {
      record_date: new Date().toISOString().split('T')[0], // Default to today's date
    },
  });

  const watchedWeight = watch('weight_kg');
  const watchedBodyFat = watch('body_fat_percentage');

  useEffect(() => {
    if (profile && profile.height_cm && profile.weight_kg && profile.age && profile.sex && profile.routine) {
      // Auto-calculate BMI
      if (profile.weight_kg && profile.height_cm) {
        const heightInMeters = profile.height_cm / 100;
        const bmi = profile.weight_kg / (heightInMeters * heightInMeters);
        setValue('bmi', parseFloat(bmi.toFixed(2)));
      }

      // Auto-calculate BMR (Harris-Benedict Equation)
      let bmr = 0;
      if (profile.sex === 'Masculino') {
        bmr = 88.362 + (13.397 * profile.weight_kg) + (4.799 * profile.height_cm) - (5.677 * profile.age);
      } else if (profile.sex === 'Feminino') {
        bmr = 447.593 + (9.247 * profile.weight_kg) + (3.098 * profile.height_cm) - (4.330 * profile.age);
      }
      setValue('basal_metabolic_rate_kcal', parseFloat(bmr.toFixed(2)));
    }
  }, [profile, setValue]);

  useEffect(() => {
    // Auto-calculate Fat Mass and Lean Mass if weight and body fat percentage are available
    if (watchedWeight !== null && watchedWeight !== undefined && watchedBodyFat !== null && watchedBodyFat !== undefined) {
      const fatMass = (watchedWeight * watchedBodyFat) / 100;
      const leanMass = watchedWeight - fatMass;
      setValue('fat_mass_kg', parseFloat(fatMass.toFixed(2)));
      setValue('lean_mass_kg', parseFloat(leanMass.toFixed(2)));
    } else {
      setValue('fat_mass_kg', null);
      setValue('lean_mass_kg', null);
    }
  }, [watchedWeight, watchedBodyFat, setValue]);


  const onSubmit = async (data: BioimpedanceFormData) => {
    if (!user || !initialized) {
      showError('Usuário não autenticado ou banco de dados não inicializado.');
      return;
    }

    try {
      await insert('bioimpedance_records', {
        user_id: user.id,
        ...data,
        created_at: new Date().toISOString(),
      });
      showSuccess('Registro de bioimpedância adicionado com sucesso!');
      onRecordAdded();
      reset({
        record_date: new Date().toISOString().split('T')[0],
        weight_kg: undefined,
        body_fat_percentage: undefined,
        muscle_mass_kg: undefined,
        water_percentage: undefined,
        notes: '',
        waist_cm: undefined, hip_cm: undefined, glutes_cm: undefined, thigh_cm: undefined, calf_cm: undefined,
        biceps_cm: undefined, forearm_cm: undefined, chest_cm: undefined, shoulders_cm: undefined,
        bmi: undefined, fat_mass_kg: undefined, lean_mass_kg: undefined,
        segmental_muscle_mass_arms_kg: undefined, segmental_muscle_mass_legs_kg: undefined, segmental_muscle_mass_trunk_kg: undefined,
        total_body_water_percentage: undefined, intracellular_water_percentage: undefined, extracellular_water_percentage: undefined,
        basal_metabolic_rate_kcal: undefined, visceral_fat_level: undefined, metabolic_age: undefined,
      });
      setIsOpen(false);
    } catch (error) {
      showError('Erro ao adicionar registro de bioimpedância.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Registro de Bioimpedância e Antropometria</DialogTitle>
          <DialogDescription>
            Preencha os dados da sua medição de bioimpedância e circunferências.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div>
            <Label htmlFor="record_date">Data do Registro</Label>
            <Input id="record_date" type="date" {...register('record_date')} />
            {errors.record_date && <p className="text-red-500 text-sm mt-1">{errors.record_date.message}</p>}
          </div>

          <h3 className="text-lg font-semibold mt-4">Medidas de Bioimpedância</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="weight_kg">Peso (kg)</Label>
              <Input id="weight_kg" type="number" step="0.1" {...register('weight_kg')} />
              {errors.weight_kg && <p className="text-red-500 text-sm mt-1">{errors.weight_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="body_fat_percentage">Gordura Corporal (%)</Label>
              <Input id="body_fat_percentage" type="number" step="0.1" {...register('body_fat_percentage')} />
              {errors.body_fat_percentage && <p className="text-red-500 text-sm mt-1">{errors.body_fat_percentage.message}</p>}
            </div>
            <div>
              <Label htmlFor="bmi">IMC</Label>
              <Input id="bmi" type="number" step="0.01" {...register('bmi')} readOnly className="bg-gray-100 dark:bg-gray-800" />
              {errors.bmi && <p className="text-red-500 text-sm mt-1">{errors.bmi.message}</p>}
            </div>
            <div>
              <Label htmlFor="fat_mass_kg">Massa Gorda (kg)</Label>
              <Input id="fat_mass_kg" type="number" step="0.1" {...register('fat_mass_kg')} readOnly className="bg-gray-100 dark:bg-gray-800" />
              {errors.fat_mass_kg && <p className="text-red-500 text-sm mt-1">{errors.fat_mass_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="lean_mass_kg">Massa Magra (kg)</Label>
              <Input id="lean_mass_kg" type="number" step="0.1" {...register('lean_mass_kg')} readOnly className="bg-gray-100 dark:bg-gray-800" />
              {errors.lean_mass_kg && <p className="text-red-500 text-sm mt-1">{errors.lean_mass_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="muscle_mass_kg">Massa Muscular Total (kg)</Label>
              <Input id="muscle_mass_kg" type="number" step="0.1" {...register('muscle_mass_kg')} />
              {errors.muscle_mass_kg && <p className="text-red-500 text-sm mt-1">{errors.muscle_mass_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="segmental_muscle_mass_arms_kg">Massa Muscular Braços (kg)</Label>
              <Input id="segmental_muscle_mass_arms_kg" type="number" step="0.1" {...register('segmental_muscle_mass_arms_kg')} />
              {errors.segmental_muscle_mass_arms_kg && <p className="text-red-500 text-sm mt-1">{errors.segmental_muscle_mass_arms_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="segmental_muscle_mass_legs_kg">Massa Muscular Pernas (kg)</Label>
              <Input id="segmental_muscle_mass_legs_kg" type="number" step="0.1" {...register('segmental_muscle_mass_legs_kg')} />
              {errors.segmental_muscle_mass_legs_kg && <p className="text-red-500 text-sm mt-1">{errors.segmental_muscle_mass_legs_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="segmental_muscle_mass_trunk_kg">Massa Muscular Tronco (kg)</Label>
              <Input id="segmental_muscle_mass_trunk_kg" type="number" step="0.1" {...register('segmental_muscle_mass_trunk_kg')} />
              {errors.segmental_muscle_mass_trunk_kg && <p className="text-red-500 text-sm mt-1">{errors.segmental_muscle_mass_trunk_kg.message}</p>}
            </div>
            <div>
              <Label htmlFor="total_body_water_percentage">Água Corporal Total (%)</Label>
              <Input id="total_body_water_percentage" type="number" step="0.1" {...register('total_body_water_percentage')} />
              {errors.total_body_water_percentage && <p className="text-red-500 text-sm mt-1">{errors.total_body_water_percentage.message}</p>}
            </div>
            <div>
              <Label htmlFor="intracellular_water_percentage">Água Intracelular (%)</Label>
              <Input id="intracellular_water_percentage" type="number" step="0.1" {...register('intracellular_water_percentage')} />
              {errors.intracellular_water_percentage && <p className="text-red-500 text-sm mt-1">{errors.intracellular_water_percentage.message}</p>}
            </div>
            <div>
              <Label htmlFor="extracellular_water_percentage">Água Extracelular (%)</Label>
              <Input id="extracellular_water_percentage" type="number" step="0.1" {...register('extracellular_water_percentage')} />
              {errors.extracellular_water_percentage && <p className="text-red-500 text-sm mt-1">{errors.extracellular_water_percentage.message}</p>}
            </div>
            <div>
              <Label htmlFor="basal_metabolic_rate_kcal">TMB (kcal)</Label>
              <Input id="basal_metabolic_rate_kcal" type="number" step="0.1" {...register('basal_metabolic_rate_kcal')} readOnly className="bg-gray-100 dark:bg-gray-800" />
              {errors.basal_metabolic_rate_kcal && <p className="text-red-500 text-sm mt-1">{errors.basal_metabolic_rate_kcal.message}</p>}
            </div>
            <div>
              <Label htmlFor="visceral_fat_level">Gordura Visceral (Nível)</Label>
              <Input id="visceral_fat_level" type="number" step="1" {...register('visceral_fat_level')} />
              {errors.visceral_fat_level && <p className="text-red-500 text-sm mt-1">{errors.visceral_fat_level.message}</p>}
            </div>
            <div>
              <Label htmlFor="metabolic_age">Idade Metabólica</Label>
              <Input id="metabolic_age" type="number" step="1" {...register('metabolic_age')} />
              {errors.metabolic_age && <p className="text-red-500 text-sm mt-1">{errors.metabolic_age.message}</p>}
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-4">Circunferências (cm)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="waist_cm">Cintura</Label>
              <Input id="waist_cm" type="number" step="0.1" {...register('waist_cm')} />
              {errors.waist_cm && <p className="text-red-500 text-sm mt-1">{errors.waist_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="hip_cm">Quadril</Label>
              <Input id="hip_cm" type="number" step="0.1" {...register('hip_cm')} />
              {errors.hip_cm && <p className="text-red-500 text-sm mt-1">{errors.hip_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="glutes_cm">Glúteos</Label>
              <Input id="glutes_cm" type="number" step="0.1" {...register('glutes_cm')} />
              {errors.glutes_cm && <p className="text-red-500 text-sm mt-1">{errors.glutes_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="thigh_cm">Coxa</Label>
              <Input id="thigh_cm" type="number" step="0.1" {...register('thigh_cm')} />
              {errors.thigh_cm && <p className="text-red-500 text-sm mt-1">{errors.thigh_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="calf_cm">Panturrilha</Label>
              <Input id="calf_cm" type="number" step="0.1" {...register('calf_cm')} />
              {errors.calf_cm && <p className="text-red-500 text-sm mt-1">{errors.calf_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="biceps_cm">Bíceps</Label>
              <Input id="biceps_cm" type="number" step="0.1" {...register('biceps_cm')} />
              {errors.biceps_cm && <p className="text-red-500 text-sm mt-1">{errors.biceps_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="forearm_cm">Antebraço</Label>
              <Input id="forearm_cm" type="number" step="0.1" {...register('forearm_cm')} />
              {errors.forearm_cm && <p className="text-red-500 text-sm mt-1">{errors.forearm_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="chest_cm">Peitoral</Label>
              <Input id="chest_cm" type="number" step="0.1" {...register('chest_cm')} />
              {errors.chest_cm && <p className="text-red-500 text-sm mt-1">{errors.chest_cm.message}</p>}
            </div>
            <div>
              <Label htmlFor="shoulders_cm">Ombros</Label>
              <Input id="shoulders_cm" type="number" step="0.1" {...register('shoulders_cm')} />
              {errors.shoulders_cm && <p className="text-red-500 text-sm mt-1">{errors.shoulders_cm.message}</p>}
            </div>
          </div>

          <div className="mt-4">
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