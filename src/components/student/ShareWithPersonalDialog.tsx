import { useState } from 'react';
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

const shareSchema = z.object({
  email: z.string().email('E-mail inválido.'),
});

type ShareFormData = z.infer<typeof shareSchema>;

const ShareWithPersonalDialog = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (open: boolean) => void }) => {
  const { grantPersonalAccess, initialized } = useGoogleSheetsDB();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShareFormData>({
    resolver: zodResolver(shareSchema),
  });

  const onSubmit = async (data: ShareFormData) => {
    if (!initialized) {
      showError('Banco de dados não inicializado.');
      return;
    }

    try {
      await grantPersonalAccess(data.email);
      showSuccess(`Acesso concedido a ${data.email}. O Personal Trainer agora pode editar seus treinos e dietas.`);
      reset();
      setIsOpen(false);
      // Refresh permissions list if parent component is listening
      window.dispatchEvent(new CustomEvent('permissionsUpdated'));
    } catch (error: any) {
      showError(error.message || 'Erro ao compartilhar planilha.');
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Compartilhar com Personal Trainer</DialogTitle>
          <DialogDescription>
            Digite o e-mail do seu Personal Trainer para conceder acesso à sua planilha. Ele poderá editar seus treinos e dietas.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              E-mail
            </Label>
            <Input id="email" type="email" {...register('email')} className="col-span-3" placeholder="personal@example.com" />
            {errors.email && <p className="col-span-4 text-red-500 text-sm text-right">{errors.email.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting || !initialized}>
              {isSubmitting ? 'Compartilhando...' : 'Compartilhar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ShareWithPersonalDialog;

