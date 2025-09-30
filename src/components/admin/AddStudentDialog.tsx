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

const studentSchema = z.object({
  first_name: z.string().min(1, 'Nome é obrigatório.'),
  last_name: z.string().min(1, 'Sobrenome é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

type StudentFormData = z.infer<typeof studentSchema>;

const AddStudentDialog = ({ isOpen, setIsOpen }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const onSubmit = async (data: StudentFormData) => {
    const { first_name, last_name, email, password } = data;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
    });

    if (error) {
      showError(error.message || 'Erro ao cadastrar aluno.');
      console.error(error);
    } else {
      showSuccess('Aluno cadastrado com sucesso! Um e-mail de confirmação foi enviado.');
      reset();
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova conta de aluno.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">
              Nome
            </Label>
            <Input id="first_name" {...register('first_name')} className="col-span-3" />
            {errors.first_name && <p className="col-span-4 text-red-500 text-sm text-right">{errors.first_name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_name" className="text-right">
              Sobrenome
            </Label>
            <Input id="last_name" {...register('last_name')} className="col-span-3" />
            {errors.last_name && <p className="col-span-4 text-red-500 text-sm text-right">{errors.last_name.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              E-mail
            </Label>
            <Input id="email" type="email" {...register('email')} className="col-span-3" />
            {errors.email && <p className="col-span-4 text-red-500 text-sm text-right">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Senha
            </Label>
            <Input id="password" type="password" {...register('password')} className="col-span-3" />
            {errors.password && <p className="col-span-4 text-red-500 text-sm text-right">{errors.password.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar Aluno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;