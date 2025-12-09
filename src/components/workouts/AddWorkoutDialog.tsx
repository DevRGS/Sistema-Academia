import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const exerciseSchema = z.object({
  name: z.string().min(1, 'Nome do exercício é obrigatório.'),
  sets: z.string().min(1, 'Séries são obrigatórias.'),
  reps: z.string().min(1, 'Repetições são obrigatórias.'),
  rest: z.string().min(1, 'Descanso é obrigatório.'),
});

const workoutSchema = z.object({
  user_id: z.string().min(1, 'ID do usuário é obrigatório.'),
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

const AddWorkoutDialog = ({ isOpen, setIsOpen, onWorkoutAdded }) => {
  const { user, profile } = useSession();
  const { select, insert, initialized } = useGoogleSheetsDB();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const isAdmin = profile?.role === 'admin';
  const isStudent = profile?.role === 'student';
  const isPersonal = profile?.role === 'personal';
  // For personal trainers, use the profile.id (which is the student's ID when viewing their spreadsheet)
  const defaultUserId = isStudent ? user?.id : (isPersonal && profile?.id ? profile.id : undefined);
  
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkoutFormData>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      user_id: defaultUserId,
      name: '',
      muscle_group: '',
      exercises: [{ name: '', sets: '', reps: '', rest: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  });

  useEffect(() => {
    const fetchStudents = async () => {
      if (!initialized) return;
      // Only admins need to fetch students list
      if (isAdmin) {
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
      }
    };
    if (isOpen && initialized) {
      fetchStudents();
    }
  }, [isOpen, initialized, isAdmin]);

  const onSubmit = async (data: WorkoutFormData) => {
    if (!initialized) {
      showError('Banco de dados não inicializado.');
      return;
    }

    try {
      // Ensure user_id is set correctly - use profile.id for personal trainers viewing student spreadsheets
      const userId = isStudent && user 
        ? String(user.id) 
        : (isPersonal && profile?.id 
          ? String(profile.id) 
          : data.user_id);
      await insert('workouts', {
        ...data,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      showSuccess('Treino criado com sucesso!');
      onWorkoutAdded();
      reset({
        user_id: defaultUserId,
        name: '',
        muscle_group: '',
        exercises: [{ name: '', sets: '', reps: '', rest: '' }],
      });
      setIsOpen(false);
    } catch (error) {
      showError('Erro ao criar treino.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Treino</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do treino e adicione os exercícios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          {isAdmin && (
            <div>
              <Label>Aluno</Label>
              <Controller
                control={control}
                name="user_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              {errors.user_id && <p className="text-red-500 text-sm mt-1">{errors.user_id.message}</p>}
            </div>
          )}
          {(isStudent || isPersonal) && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                {isStudent 
                  ? 'Você está criando um treino para si mesmo.'
                  : 'Você está criando um treino para o aluno cuja planilha está visualizando.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome do Treino (Ex: Treino A)</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="muscle_group">Grupo Muscular (Ex: Peito e Tríceps)</Label>
              <Input id="muscle_group" {...register('muscle_group')} />
              {errors.muscle_group && <p className="text-red-500 text-sm mt-1">{errors.muscle_group.message}</p>}
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
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Label htmlFor={`exercises.${index}.sets`} className="text-xs">Séries</Label>
                    <Input {...register(`exercises.${index}.sets`)} />
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Label htmlFor={`exercises.${index}.reps`} className="text-xs">Reps</Label>
                    <Input {...register(`exercises.${index}.reps`)} />
                  </div>
                  <div className="col-span-8 sm:col-span-1">
                    <Label htmlFor={`exercises.${index}.rest`} className="text-xs">Desc.</Label>
                    <Input {...register(`exercises.${index}.rest`)} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {errors.exercises && <p className="text-red-500 text-sm mt-1">{errors.exercises.message}</p>}
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

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Treino'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorkoutDialog;