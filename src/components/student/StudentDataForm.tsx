import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '../ui/skeleton';

const daysOfWeek = [
  { id: 'segunda', label: 'Seg' },
  { id: 'terca', label: 'Ter' },
  { id: 'quarta', label: 'Qua' },
  { id: 'quinta', label: 'Qui' },
  { id: 'sexta', label: 'Sex' },
  { id: 'sabado', label: 'Sáb' },
  { id: 'domingo', label: 'Dom' },
];

const studentDataSchema = z.object({
  height_cm: z.coerce.number().positive('Altura deve ser positiva.').optional().nullable(),
  weight_kg: z.coerce.number().positive('Peso deve ser positivo.').optional().nullable(),
  sex: z.enum(['Masculino', 'Feminino']).optional().nullable(),
  age: z.coerce.number().int().positive('Idade deve ser positiva.').optional().nullable(),
  routine: z.enum(['Sedentária', 'Ativa', 'Atleta']).optional().nullable(),
  locomotion_type: z.enum(['Caminha', 'Corre', 'Bicicleta', 'Carro']).optional().nullable(),
  locomotion_distance_km: z.coerce.number().positive('Distância deve ser positiva.').optional().nullable(),
  locomotion_time_minutes: z.coerce.number().int().positive('Tempo deve ser positivo.').optional().nullable(),
  locomotion_days: z.array(z.string()).optional().nullable(),
});

type StudentFormData = z.infer<typeof studentDataSchema>;

const StudentDataForm = () => {
  const { user, profile, loading } = useSession();
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentDataSchema),
    defaultValues: {
      locomotion_days: [],
    },
  });

  const locomotionType = form.watch('locomotion_type');
  const showLocomotionDetails = locomotionType && ['Caminha', 'Corre', 'Bicicleta'].includes(locomotionType);

  useEffect(() => {
    if (profile) {
      form.reset({
        height_cm: profile.height_cm || undefined,
        weight_kg: profile.weight_kg || undefined,
        sex: profile.sex || undefined,
        age: profile.age || undefined,
        routine: profile.routine || undefined,
        locomotion_type: profile.locomotion_type || undefined,
        locomotion_distance_km: profile.locomotion_distance_km || undefined,
        locomotion_time_minutes: profile.locomotion_time_minutes || undefined,
        locomotion_days: profile.locomotion_days || [],
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: StudentFormData) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);

    if (error) {
      showError('Erro ao salvar os dados.');
      console.error(error);
    } else {
      showSuccess('Dados salvos com sucesso!');
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Dados</CardTitle>
        <CardDescription>
          Preencha suas informações para um acompanhamento mais preciso e cálculo de suas necessidades calóricas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="height_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm)</FormLabel>
                  <FormControl><Input type="number" placeholder="175" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weight_kg" render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl><Input type="number" placeholder="78.5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>Idade</FormLabel>
                  <FormControl><Input type="number" placeholder="30" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="routine" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rotina</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Sedentária">Sedentária</SelectItem>
                      <SelectItem value="Ativa">Ativa</SelectItem>
                      <SelectItem value="Atleta">Atleta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="locomotion_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Locomoção Principal (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="Caminha">Caminha</SelectItem>
                    <SelectItem value="Corre">Corre</SelectItem>
                    <SelectItem value="Bicicleta">Bicicleta</SelectItem>
                    <SelectItem value="Carro">Carro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {showLocomotionDetails && (
              <div className="p-4 border rounded-md space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="locomotion_distance_km" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distância (km)</FormLabel>
                      <FormControl><Input type="number" placeholder="5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="locomotion_time_minutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo médio (minutos)</FormLabel>
                      <FormControl><Input type="number" placeholder="30" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="locomotion_days" render={() => (
                  <FormItem>
                    <FormLabel>Dias da semana</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {daysOfWeek.map((item) => (
                        <FormField key={item.id} control={form.control} name="locomotion_days" render={({ field }) => (
                          <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(field.value?.filter((value) => value !== item.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{item.label}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Dados'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default StudentDataForm;