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

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'student' | 'personal';
  email?: string;
  height_cm?: number | string;
  weight_kg?: number | string;
  sex?: string;
  age?: number | string;
  routine?: string;
  locomotion_type?: string;
  locomotion_distance_km?: number | string;
  locomotion_time_minutes?: number | string;
  locomotion_days?: string[] | string;
};

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
  const { update, insert, select, initialized, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
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
    const loadProfileData = async () => {
      if (!initialized || !user) {
        return;
      }

      console.log('StudentDataForm: Loading profile data, profile from context:', profile);
      
      try {
        // Buscar perfil diretamente do banco para garantir dados atualizados
        const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
        const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
        
        const profilesFromDB = await select<Profile>('profiles', {
          eq: { column: 'id', value: userId }
        });

        const profileData = profilesFromDB.length > 0 ? profilesFromDB[0] : profile;
        
        if (!profileData) {
          console.log('StudentDataForm: No profile data found');
          return;
        }

        console.log('StudentDataForm: Profile data from DB:', profileData);
        
        // Buscar peso mais recente do histórico (se houver)
        let latestWeightFromHistory: number | null = null;
        try {
          const weightHistory = await select<{ weight_kg: number; created_at: string }>('weight_history', {
            eq: { column: 'user_id', value: userId },
            order: { column: 'created_at', ascending: false },
          });
          
          if (weightHistory && weightHistory.length > 0) {
            latestWeightFromHistory = weightHistory[0].weight_kg;
            console.log('StudentDataForm: Latest weight from history:', latestWeightFromHistory);
          }
        } catch (error) {
          console.warn('StudentDataForm: Error loading weight history:', error);
        }

        // Parse locomotion_days if it's a string (from Google Sheets)
        let locomotionDays = profileData.locomotion_days || [];
        if (typeof locomotionDays === 'string') {
          try {
            locomotionDays = JSON.parse(locomotionDays);
          } catch {
            locomotionDays = [];
          }
        }

        // Usar peso do histórico se disponível, senão usar do perfil
        const weightToUse = latestWeightFromHistory !== null 
          ? latestWeightFromHistory 
          : (profileData.weight_kg ? Number(profileData.weight_kg) : null);

        const formData = {
          height_cm: profileData.height_cm ? Number(profileData.height_cm) : null,
          weight_kg: weightToUse,
          sex: profileData.sex || null,
          age: profileData.age ? Number(profileData.age) : null,
          routine: profileData.routine || null,
          locomotion_type: profileData.locomotion_type || null,
          locomotion_distance_km: profileData.locomotion_distance_km ? Number(profileData.locomotion_distance_km) : null,
          locomotion_time_minutes: profileData.locomotion_time_minutes ? Number(profileData.locomotion_time_minutes) : null,
          locomotion_days: Array.isArray(locomotionDays) ? locomotionDays : [],
        };
        
        console.log('StudentDataForm: Form data to set:', formData);
        form.reset(formData);
      } catch (error) {
        console.error('StudentDataForm: Error loading profile data:', error);
      }
    };

    loadProfileData();
  }, [initialized, user, profile, spreadsheetId, originalSpreadsheetId, select, form]);

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
      
      // Se o peso foi atualizado, adicionar ao histórico de peso também (sincronização bilateral)
      if (data.weight_kg !== null && data.weight_kg !== undefined) {
        try {
          // Verificar se já existe um registro de peso para hoje
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const todayWeight = await select<{ id: string }>('weight_history', {
            eq: { column: 'user_id', value: user.id },
            gte: { column: 'created_at', value: today.toISOString() },
            lt: { column: 'created_at', value: tomorrow.toISOString() },
          });

          if (todayWeight.length === 0) {
            // Adicionar ao histórico apenas se não houver registro de hoje
            await insert('weight_history', {
              user_id: String(user.id),
              weight_kg: data.weight_kg,
              created_at: new Date().toISOString(),
            });
            console.log('StudentDataForm: Peso adicionado ao histórico');
          } else {
            // Atualizar registro de hoje se já existir
            await update('weight_history', {
              weight_kg: data.weight_kg,
            }, {
              column: 'id',
              value: todayWeight[0].id
            });
            console.log('StudentDataForm: Peso atualizado no histórico');
          }
        } catch (weightError) {
          console.error('StudentDataForm: Erro ao sincronizar peso no histórico:', weightError);
          // Não bloquear se falhar, o perfil já foi atualizado
        }
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
        
        // Se o peso foi atualizado, disparar evento para atualizar WeightCard
        if (data.weight_kg !== null && data.weight_kg !== undefined) {
          window.dispatchEvent(new CustomEvent('weightAdded'));
        }
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