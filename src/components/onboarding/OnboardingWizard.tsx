import { useState, useEffect } from 'react';
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
import { showSuccess, showError } from '@/utils/toast';
import { loadLimitations, type Limitation } from '@/utils/exerciseService';
import { generateWorkouts } from '@/utils/workoutGenerator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const personalDataSchema = z.object({
  height_cm: z.coerce.number().positive('Altura deve ser positiva.').min(100, 'Altura mínima: 100cm').max(250, 'Altura máxima: 250cm'),
  weight_kg: z.coerce.number().positive('Peso deve ser positivo.').min(30, 'Peso mínimo: 30kg').max(300, 'Peso máximo: 300kg'),
  sex: z.enum(['Masculino', 'Feminino']),
  age: z.coerce.number().int().positive('Idade deve ser positiva.').min(12, 'Idade mínima: 12 anos').max(120, 'Idade máxima: 120 anos'),
  routine: z.enum(['Sedentária', 'Ativa', 'Atleta']),
  locomotion_type: z.enum(['Caminha', 'Corre', 'Bicicleta', 'Carro']).optional().nullable().default(null),
  locomotion_distance_km: z.coerce.number().positive('Distância deve ser positiva.').optional().nullable().default(null),
  locomotion_time_minutes: z.coerce.number().int().positive('Tempo deve ser positivo.').optional().nullable().default(null),
  locomotion_days: z.array(z.string()).optional().nullable().default([]),
});

type PersonalDataFormData = z.infer<typeof personalDataSchema>;

const OnboardingWizard = () => {
  const { user, profile } = useSession();
  const { select, insert, update, initialized } = useGoogleSheetsDB();
  const [step, setStep] = useState(1);
  const [limitations, setLimitations] = useState<Limitation[]>([]);
  const [userLimitations, setUserLimitations] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [generatingWorkout, setGeneratingWorkout] = useState(false);
  const [loadingLimitations, setLoadingLimitations] = useState(true);

  const form = useForm<PersonalDataFormData>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
      height_cm: undefined,
      weight_kg: undefined,
      sex: undefined,
      age: undefined,
      routine: undefined,
      locomotion_type: null,
      locomotion_distance_km: null,
      locomotion_time_minutes: null,
      locomotion_days: [],
    },
  });

  const locomotionType = form.watch('locomotion_type');
  const showLocomotionDetails = locomotionType && ['Caminha', 'Corre', 'Bicicleta'].includes(locomotionType);

  useEffect(() => {
    const loadData = async () => {
      if (initialized) {
        setLoadingLimitations(true);
        try {
          const lims = await loadLimitations();
          setLimitations(lims);
        } catch (error) {
          console.error('Erro ao carregar limitações:', error);
        } finally {
          setLoadingLimitations(false);
        }
      }
    };
    loadData();
  }, [initialized]);

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await form.trigger();
      if (isValid) {
        setStep(2);
      }
    } else if (step === 2) {
      await handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!user || !initialized) return;

    setLoading(true);
    try {
      const formData = form.getValues();
      const limitationsJson = JSON.stringify(userLimitations);

      // Salvar dados pessoais
      const profiles = await select<{ id: string }>('profiles', {
        eq: { column: 'id', value: user.id }
      });

      const profileData = {
        id: user.id,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        role: profile?.role || 'student',
        email: user.email,
        ...formData,
        // Ensure locomotion_days is stored as JSON string
        locomotion_days: JSON.stringify(formData.locomotion_days || []),
        limitations: limitationsJson,
      };

      if (profiles.length > 0) {
        await update('profiles', profileData, {
          column: 'id',
          value: user.id
        });
      } else {
        await insert('profiles', profileData);
      }

      // Salvar histórico de perfil
      await insert('profile_history', {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        user_id: String(user.id),
        ...formData,
        created_at: new Date().toISOString(),
      });

      // Salvar peso inicial no histórico de peso (para aparecer no gráfico)
      if (formData.weight_kg) {
        try {
          await insert('weight_history', {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            user_id: String(user.id),
            weight_kg: formData.weight_kg,
            created_at: new Date().toISOString(),
          });
          console.log('OnboardingWizard: Peso inicial adicionado ao histórico');
        } catch (weightError) {
          console.error('OnboardingWizard: Erro ao adicionar peso inicial ao histórico:', weightError);
          // Não bloquear se falhar, o perfil já foi salvo
        }
      }

      // Gerar treino inicial automaticamente
      setGeneratingWorkout(true);
      try {
        const workouts = await generateWorkouts(
          'beginner',
          userLimitations,
          limitations
        );

        // Importar função para inicializar treinos com datas
        const { initializeWorkoutWithDates, DEFAULT_ADAPTATION_PERIOD_DAYS } = await import('@/utils/workoutExpirationService');
        
        for (const workout of workouts) {
          const workoutWithDates = initializeWorkoutWithDates({
            user_id: String(user.id),
            name: workout.name,
            muscle_group: workout.muscle_group,
            exercises: JSON.stringify(workout.exercises),
            created_at: new Date().toISOString(),
          }, DEFAULT_ADAPTATION_PERIOD_DAYS);
          
          await insert('workouts', workoutWithDates);
        }

        showSuccess('Perfil criado e treino inicial gerado com sucesso!');
        
        // Disparar evento para atualizar perfil no SessionContext
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        
        // Disparar evento para indicar que onboarding foi concluído
        window.dispatchEvent(new CustomEvent('onboardingCompleted', { 
          detail: { showTutorial: true } 
        }));
        
        // Aguardar um pouco para o perfil ser atualizado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Forçar recarregamento da página para atualizar o estado
        window.location.reload();
      } catch (error) {
        console.error('Erro ao gerar treino:', error);
        showSuccess('Perfil criado com sucesso!');
        
        // Disparar eventos mesmo em caso de erro
        window.dispatchEvent(new CustomEvent('profileUpdated'));
        window.dispatchEvent(new CustomEvent('onboardingCompleted', { 
          detail: { showTutorial: true } 
        }));
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
      }
    } catch (error) {
      showError('Erro ao salvar dados.');
      console.error(error);
    } finally {
      setLoading(false);
      setGeneratingWorkout(false);
    }
  };

  const handleToggleLimitation = (limitação: string) => {
    setUserLimitations(prev => ({
      ...prev,
      [limitação]: !prev[limitação]
    }));
  };

  const selectedLimitationsCount = Object.values(userLimitations).filter(Boolean).length;
  const progress = (step / 2) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader className="border-b pb-4">
          <div className="space-y-2">
            <CardTitle className="text-3xl flex items-center gap-2">
              <span className="bg-primary/10 p-2 rounded-lg">🎯</span>
              Bem-vindo ao Black Academy!
            </CardTitle>
            <CardDescription className="text-base">
              Vamos configurar seu perfil em apenas 2 passos para oferecer a melhor experiência personalizada
            </CardDescription>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Passo {step} de 2</span>
              <span>{Math.round(progress)}% completo</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {step === 1 && (
            <Form {...form}>
              <form className="space-y-6">
                <Alert className="border-primary/50 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    Essas informações são essenciais para calcular suas necessidades calóricas e personalizar seus treinos de forma segura e eficaz.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="height_cm" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-semibold">
                        Altura (cm) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 175" 
                          className="h-12 text-lg"
                          {...field} 
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="weight_kg" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-semibold">
                        Peso (kg) <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 78.5" 
                          className="h-12 text-lg"
                          step="0.1"
                          {...field} 
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="sex" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-semibold">
                        Sexo <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="Selecione seu sexo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="age" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-semibold">
                        Idade <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ex: 30" 
                          className="h-12 text-lg"
                          {...field} 
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="routine" render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-base font-semibold">
                      Nível de Atividade <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-lg">
                          <SelectValue placeholder="Selecione seu nível de atividade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Sedentária">
                          <div className="flex flex-col">
                            <span>Sedentária</span>
                            <span className="text-xs text-muted-foreground">Pouco ou nenhum exercício</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Ativa">
                          <div className="flex flex-col">
                            <span>Ativa</span>
                            <span className="text-xs text-muted-foreground">Exercício regular 3-5x por semana</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Atleta">
                          <div className="flex flex-col">
                            <span>Atleta</span>
                            <span className="text-xs text-muted-foreground">Exercício intenso 6-7x por semana</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Locomoção Principal (Opcional)</h3>
                    <span className="text-xs text-muted-foreground">Para cálculo mais preciso do gasto calórico</span>
                  </div>
                  
                  <FormField control={form.control} name="locomotion_type" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-semibold">
                        Tipo de Locomoção
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="Selecione o tipo de locomoção" />
                          </SelectTrigger>
                        </FormControl>
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
                    <div className="p-4 border rounded-md space-y-4 bg-muted/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="locomotion_distance_km" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Distância (km)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Ex: 5" 
                                className="h-12 text-lg"
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
                                placeholder="Ex: 30" 
                                className="h-12 text-lg"
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
                            {[
                              { id: 'segunda', label: 'Seg' },
                              { id: 'terca', label: 'Ter' },
                              { id: 'quarta', label: 'Qua' },
                              { id: 'quinta', label: 'Qui' },
                              { id: 'sexta', label: 'Sex' },
                              { id: 'sabado', label: 'Sáb' },
                              { id: 'domingo', label: 'Dom' },
                            ].map((item) => (
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
                                  <FormLabel className="font-normal cursor-pointer">{item.label}</FormLabel>
                                </FormItem>
                              )} />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    size="lg"
                    className="min-w-[140px]"
                  >
                    Continuar <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <Alert className="border-primary/50 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  Selecione suas limitações físicas (se houver). Isso ajudará nosso sistema a filtrar exercícios adequados e garantir sua segurança durante os treinos.
                </AlertDescription>
              </Alert>

              {loadingLimitations ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="font-semibold">Limitação</TableHead>
                          <TableHead className="font-semibold">Coluna Alvo</TableHead>
                          <TableHead className="text-center font-semibold">Limite Máx.</TableHead>
                          <TableHead className="text-center font-semibold">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {limitations.map((limitation) => (
                          <TableRow 
                            key={limitation.limitação}
                            className={userLimitations[limitation.limitação] ? 'bg-primary/5' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={userLimitations[limitation.limitação] || false}
                                onCheckedChange={() => handleToggleLimitation(limitation.limitação)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {limitation.limitação}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {limitation.colunaAlvo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{limitation.limiteMaximoPermitido}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                className={
                                  limitation.acao === 'Bloqueio Total' 
                                    ? 'bg-red-500 hover:bg-red-600' 
                                    : 'bg-yellow-500 hover:bg-yellow-600'
                                }
                              >
                                {limitation.acao}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {selectedLimitationsCount > 0 && (
                    <Alert className="border-green-500/50 bg-green-500/5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-sm">
                        <strong>{selectedLimitationsCount}</strong> limitação(ões) selecionada(s). 
                        O sistema filtrará automaticamente os exercícios adequados para você.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(1)}
                      size="lg"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleFinish} 
                      disabled={loading || generatingWorkout}
                      size="lg"
                      className="min-w-[200px]"
                    >
                      {generatingWorkout ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando seu treino...
                        </>
                      ) : loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Finalizar e Gerar Treino
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingWizard;

