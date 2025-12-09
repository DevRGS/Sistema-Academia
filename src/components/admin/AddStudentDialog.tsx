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
import { showError, showSuccess } from '@/utils/toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const studentSchema = z.object({
  first_name: z.string().min(1, 'Nome é obrigatório.'),
  last_name: z.string().min(1, 'Sobrenome é obrigatório.'),
  email: z.string().email('E-mail inválido.'),
});

type StudentFormData = z.infer<typeof studentSchema>;

const AddStudentDialog = ({ isOpen, setIsOpen }) => {
  const { insert, select, initialized } = useGoogleSheetsDB();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  const onSubmit = async (data: StudentFormData) => {
    if (!initialized) {
      showError('Banco de dados não inicializado.');
      return;
    }

    try {
      const { first_name, last_name, email } = data;

      // Verificar se já existe um perfil com este email
      const existingProfiles = await select<{ id: string; email?: string }>('profiles');
      const existingProfile = existingProfiles.find(p => p.email === email);

      if (existingProfile) {
        showError('Já existe um perfil com este e-mail.');
        return;
      }

      // Criar um perfil temporário (o ID será o email até o usuário fazer login com Google)
      // Quando o usuário fizer login com Google usando este email, o perfil será vinculado
      const tempId = `temp_${Date.now()}_${email}`;
      await insert('profiles', {
        id: tempId,
        first_name,
        last_name,
        email,
        role: 'student',
      });

      showSuccess('Perfil de aluno criado com sucesso! O aluno deve fazer login com Google usando este e-mail para ativar a conta.');
      reset();
      setIsOpen(false);
    } catch (error: any) {
      showError(error.message || 'Erro ao cadastrar aluno.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
          <DialogDescription>
            Crie um perfil para um novo aluno. O aluno deve fazer login com Google usando o e-mail fornecido.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Com a autenticação Google, os alunos se registram diretamente. Este formulário cria um perfil pré-configurado que será vinculado quando o aluno fizer login com Google usando o e-mail fornecido.
            </AlertDescription>
          </Alert>
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