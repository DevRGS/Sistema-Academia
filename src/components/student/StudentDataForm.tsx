import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '../ui/skeleton';
import ProfileHistoryDialog from './ProfileHistoryDialog';
import { History } from 'lucide-react';

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
  height_cm: z.coerce.number().positive('Altura deve ser positiva.').optional().nullable().default(null),
  weight_kg: z.coerce.number().positive('Peso deve ser positivo.').optional().nullable().default(null),
  sex: z.enum(['Masculino', 'Feminino']).optional().nullable().default(null),
  age: z.coerce.number().int().positive('Idade deve ser positiva.').optional().nullable().default(null),
  routine: z.enum(['Sedentária', 'Ativa', 'Atleta']).optional().nullable().default(null),
  locomotion_type: z.enum(['Caminha', 'Corre', 'Bicicleta', 'Carro']).optional().nullable().default(null),
  locomotion_distance_km: z.coerce.number().positive('Distância deve ser positiva.').optional().nullable().default(null),
  locomotion_time_minutes: z.coerce.number().int().positive('Tempo deve ser positivo.').optional().nullable().default(null),
  locomotion_days: z.array(z.string()).optional().nullable().default([]),
});

type StudentFormData = z.infer<typeof studentDataSchema>;

const StudentDataForm = () => {
  const { user, profile, loading } = useSession();
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentDataSchema),
    defaultValues: {
      height_cm: null,
      weight_kg: null,
      sex: null,
      age: null,
      routine: null,
      locomotion_type: null,
      locomotion_distance_km: null,
      locomotion_time_minutes: null,
      locomotion_days: [],
    },
  });

  const locomotionType = form.watch('locomotion_type');
  const showLocomotionDetails = locomotionType && ['Caminha', 'Corre', 'Bicicleta'].includes(locomotionType);

  useEffect(() => {
    if (profile) {
      console.log('Loading profile data into form:', profile);
      // Parse locomotion_days if it's a string (from Google Sheets)
      let locomotionDays = profile.locomotion_days || [];
      if (typeof locomotionDays === 'string') {
        try {
          locomotionDays = JSON.parse(locomotionDays);
        } catch {
          locomotionDays = [];
        }
      }

      const formData = {
        height_cm: profile.height_cm ? Number(profile.height_cm) : null,
        weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
        sex: profile.sex || null,
        age: profile.age ? Number(profile.age) : null,
        routine: profile.routine || null,
        locomotion_type: profile.locomotion_type || null,
        locomotion_distance_km: profile.locomotion_distance_km ? Number(profile.locomotion_distance_km) : null,
        locomotion_time_minutes: profile.locomotion_time_minutes ? Number(profile.locomotion_time_minutes) : null,
        locomotion_days: Array.isArray(locomotionDays) ? locomotionDays : [],
      };
      
      console.log('Form data to set:', formData);
      form.reset(formData);
    }
  }, [profile, form]);

  const { update, insert, select, initialized } = useGoogleSheetsDB();

  const onSubmit = async (data: StudentFormData) => {
    if (!user || !initialized) return;

    try {
      // Try to find existing profile
      const existingProfiles = await select<{ id: string }>('profiles', { eq: { column: 'id', value: user.id } });
      
      if (existingProfiles.length > 0) {
        // Update existing profile
        await update('profiles', data, { column: 'id', value: user.id });
      } else {
        // Insert new profile with user ID and additional data
        await insert('profiles', {
          id: user.id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          role: profile?.role || 'student',
          email: user.email,
          ...data,
        });
      }
      
      // Save to history - ensure user_id is saved as string to avoid truncation
      await insert('profile_history', {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        user_id: String(user.id), // Convert to string to prevent number truncation
        ...data,
        created_at: new Date().toISOString(),
      });
      
      // Reload profile from database to get updated data
      const updatedProfiles = await select<Profile & { email?: string }>('profiles', { eq: { column: 'id', value: user.id } });
      if (updatedProfiles.length > 0) {
        // Trigger profile reload in SessionContext
        window.dispatchEvent(new CustomEvent('profileUpdated'));
      }
      
      showSuccess('Dados salvos com sucesso!');
    } catch (error) {
      showError('Erro ao salvar os dados.');
      console.error(error);
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meus Dados</CardTitle>
              <CardDescription>
                Preencha suas informações para um acompanhamento mais preciso e cálculo de suas necessidades calóricas.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setHistoryDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Histórico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="height_cm" render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="175" 
                      {...field} 
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weight_kg" render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="78.5" 
                      {...field} 
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="age" render={({ field }) => (
                <FormItem>
                  <FormLabel>Idade</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="30" 
                      {...field} 
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="sex" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
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
                  <Select onValueChange={field.onChange} value={field.value || ''}>
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
                <Select onValueChange={field.onChange} value={field.value || ''}>
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
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="5" 
                          {...field} 
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="locomotion_time_minutes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tempo médio (minutos)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="30" 
                          {...field} 
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
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
    
    <ProfileHistoryDialog isOpen={historyDialogOpen} setIsOpen={setHistoryDialogOpen} />
    </>
  );
};

export default StudentDataForm;