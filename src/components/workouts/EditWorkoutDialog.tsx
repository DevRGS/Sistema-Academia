import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { PlusCircle, Trash2, Save, X } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Exercise, Workout } from '@/pages/Workouts';

const exerciseSchema = z.object({
  name: z.string().min(1, 'Nome do exercício é obrigatório.'),
  sets: z.string().min(1, 'Séries são obrigatórias.'),
  reps: z.string().min(1, 'Repetições são obrigatórias.'),
  rest: z.string().min(1, 'Descanso é obrigatório.'),
});

const workoutSchema = z.object({
  user_id: z.string().uuid('Selecione um aluno.'),
  name: z.string().min(1, 'Nome do treino é obrigatório.'),
  muscle_group: z.string().min(1, 'Grupo muscular é obrigatório.'),
  exercises: z.array(exerciseSchema).min(1, 'Adicione pelo menos um exercício.'),
});

type WorkoutFormData = z.infer<typeof workoutSchema>;

type StudentProfile = {
  id: string;
  first_name: string;
  last_name: string;
};

const EditWorkoutDialog = ({ 
  workout, 
  isOpen, 
  setIsOpen, 
  onWorkoutUpdated 
}: { 
  workout: Workout | null; 
  isOpen: boolean; 
  setIsOpen: (open: boolean) => void;
  onWorkoutUpdated: () => void;
}) => {
  const { select, update, delete: deleteRow, initialized } = useGoogleSheetsDB();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      user_id: '',
      name: '',
      muscle_group: '',
      exercises: [{ name: '', sets: '', reps: '', rest: '' }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'exercises',
  });

  useEffect(() => {
    const fetchStudents = async () => {
      if (!initialized) return;
      try {
        const data = await select<StudentProfile>('profiles', { eq: { column: 'role', value: 'student' } });
        // Remove duplicates by ID - keep only the first occurrence of each unique ID
        const uniqueStudents = data.filter((student, index, self) => 
          index === self.findIndex((s) => String(s.id) === String(student.id))
        );
        setStudents(uniqueStudents);
      } catch (error) {
        showError('Erro ao buscar alunos.');
        console.error(error);
      }
    };
    
    if (isOpen && initialized) {
      fetchStudents();
    }
  }, [isOpen, initialized]);

  useEffect(() => {
    if (workout && isOpen) {
      // Parse exercises if it's a string
      let exercises = workout.exercises;
      if (typeof exercises === 'string') {
        try {
          exercises = JSON.parse(exercises);
        } catch (e) {
          console.error('Error parsing exercises:', e);
          exercises = [];
        }
      }
      reset({
        user_id: workout.user_id,
        name: workout.name,
        muscle_group: workout.muscle_group,
        exercises: exercises,
      });
    }
  }, [workout, isOpen, reset]);

  const onSubmit = async (data: WorkoutFormData) => {
    if (!workout || !initialized) return;

    try {
      await update('workouts', data, { column: 'id', value: workout.id });
      showSuccess('Treino atualizado com sucesso!');
      onWorkoutUpdated();
      setIsOpen(false);
    } catch (error) {
      showError('Erro ao atualizar treino.');
      console.error(error);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!workout || !initialized) return;
    
    const confirmed = window.confirm('Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    try {
      await deleteRow('workouts', { column: 'id', value: workout.id });
      showSuccess('Treino excluído com sucesso!');
      onWorkoutUpdated();
      setIsOpen(false);
    } catch (error) {
      showError('Erro ao excluir treino.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Treino</DialogTitle>
          <DialogDescription>
            Modifique os detalhes do treino e seus exercícios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div>
            <Label>Aluno</Label>
            <Controller
              control={control}
              name="user_id"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.user_id && <p className="text-red-500 text-sm mt-1">{errors.user_id.message}</p>
}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Treino (Ex: Treino A)</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
}
            </div>
            <div>
              <Label htmlFor="muscle_group">Grupo Muscular (Ex: Peito e Tríceps)</Label>
              <Input id="muscle_group" {...register('muscle_group')} />
              {errors.muscle_group && <p className="text-red-500 text-sm mt-1">{errors.muscle_group.message}</p>
}
            </div>
          </div>

          <div>
            <Label>Exercícios</Label>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-10 gap-2 items-end p-2 border rounded-md">
                  <div className="col-span-10 sm:col-span-4">
                    <Label htmlFor={`exercises.${index}.name`} className="text-xs">Exercício</Label>
                    <Input {...register(`exercises.${index}.name`)} />
                    {errors.exercises?.[index]?.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.exercises[index].name.message}</p>
                    )}
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Label htmlFor={`exercises.${index}.sets`} className="text-xs">Séries</Label>
                    <Input {...register(`exercises.${index}.sets`)} />
                    {errors.exercises?.[index]?.sets && (
                      <p className="text-red-500 text-sm mt-1">{errors.exercises[index].sets.message}</p>
                    )}
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Label htmlFor={`exercises.${index}.reps`} className="text-xs">Reps</Label>
                    <Input {...register(`exercises.${index}.reps`)} />
                    {errors.exercises?.[index]?.reps && (
                      <p className="text-red-500 text-sm mt-1">{errors.exercises[index].reps.message}</p>
                    )}
                  </div>
                  <div className="col-span-8 sm:col-span-1">
                    <Label htmlFor={`exercises.${index}.rest`} className="text-xs">Desc.</Label>
                    <Input {...register(`exercises.${index}.rest`)} />
                    {errors.exercises?.[index]?.rest && (
                      <p className="text-red-500 text-sm mt-1">{errors.exercises[index].rest.message}</p>
                    )}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {errors.exercises && <p className="text-red-500 text-sm mt-1">{errors.exercises.message}</p>
}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ name: '', sets: '', reps: '', rest: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Exercício
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="destructive" onClick={handleDeleteWorkout}>
              <X className="mr-2 h-4 w-4" />
              Excluir Treino
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditWorkoutDialog;