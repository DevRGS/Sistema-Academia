import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dumbbell, Utensils, Users, UserPlus, Scale, BarChart3, Play, Home } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Button } from '@/components/ui/button';
import AddStudentDialog from '@/components/admin/AddStudentDialog';
import BmrCard from '@/components/dashboard/BmrCard';
import WeightCard from '@/components/dashboard/WeightCard';
import LevelCard from '@/components/dashboard/LevelCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showError } from '@/utils/toast';

type Workout = {
  id: number;
  user_id: string;
  name: string;
  muscle_group: string;
  exercises: unknown;
  created_at: string;
};

const Dashboard = () => {
  const { profile, loading: sessionLoading, user } = useSession();
  const { select, initialized, loading: dbLoading, spreadsheetId, originalSpreadsheetId } = useGoogleSheetsDB();
  const navigate = useNavigate();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isStartWorkoutOpen, setIsStartWorkoutOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const isAdmin = profile?.role === 'admin';

  // Aguardar até que todos os dados necessários estejam carregados
  useEffect(() => {
    // Só considerar pronto quando:
    // 1. Sessão não está carregando
    // 2. Banco de dados está inicializado
    // 3. Banco não está carregando
    // 4. Usuário está autenticado
    const ready = !sessionLoading && !dbLoading && initialized && !!user;
    
    if (ready && !isReady) {
      // Pequeno delay para garantir que os componentes filhos também estejam prontos
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else if (!ready) {
      setIsReady(false);
    }
  }, [sessionLoading, dbLoading, initialized, user, isReady]);

  const fetchWorkoutsForStart = async () => {
    if (!initialized || !user || profile?.role === 'admin') return;
    setWorkoutsLoading(true);
    try {
      const isViewingSharedSpreadsheet = spreadsheetId && originalSpreadsheetId && spreadsheetId !== originalSpreadsheetId;
      const userId = (isViewingSharedSpreadsheet && profile?.id) ? String(profile.id) : String(user.id);
      const data = await select<Workout>('workouts', {
        eq: { column: 'user_id', value: userId },
        order: { column: 'created_at', ascending: false },
      });
      setWorkouts(data);
    } catch (err) {
      console.error('Erro ao carregar treinos:', err);
      showError('Não foi possível carregar a lista de treinos.');
    } finally {
      setWorkoutsLoading(false);
    }
  };

  useEffect(() => {
    if (isStartWorkoutOpen && initialized && !isAdmin) {
      fetchWorkoutsForStart();
    }
  }, [isStartWorkoutOpen, initialized, isAdmin]);

  const handleStartWorkout = (workoutId: number) => {
    setIsStartWorkoutOpen(false);
    navigate(`/workout-session/${workoutId}`);
  };

  // Mostrar loading enquanto não estiver pronto
  if (!isReady) {
    return (
      <div className="dashboard-bg rounded-xl p-4 sm:p-6 md:p-8 min-h-[calc(100vh-6rem)] space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {!isAdmin && <Skeleton className="h-[120px] w-full" />}
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          {!isAdmin && <Skeleton className="h-[120px] w-full" />}
        </div>
      </div>
    );
  }

  const IconWrap = ({ children }: { children: React.ReactNode }) => (
    <div className="icon-circle">{children}</div>
  );

  return (
    <div className="dashboard-bg rounded-xl p-4 sm:p-6 md:p-8 min-h-[calc(100vh-6rem)]">
      <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
        {/* Topo: ícone casa (esquerda), Iniciar Treino (centro, só alunos), Novo Aluno (direita, só admin) */}
        <div className="grid grid-cols-3 items-center gap-2">
          <div className="flex justify-start">
            <NavLink to="/dashboard" className="flex items-center justify-center rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" aria-label="Início">
              <Home className="h-6 w-6 sm:h-7 sm:w-7" />
            </NavLink>
          </div>
          <div className="flex justify-center">
            {!isAdmin && (
              <Button
                size="lg"
                className="min-w-[200px] sm:min-w-[240px] h-12 text-base font-semibold"
                onClick={() => setIsStartWorkoutOpen(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Iniciar Treino
              </Button>
            )}
          </div>
          <div className="flex justify-end">
            {isAdmin && (
              <Button onClick={() => setIsAddStudentDialogOpen(true)} size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Aluno
              </Button>
            )}
          </div>
        </div>

        {isAdmin && (
          <AddStudentDialog
            isOpen={isAddStudentDialogOpen}
            setIsOpen={setIsAddStudentDialogOpen}
          />
        )}

        {/* Dialog: lista de treinos para escolher */}
        <Dialog open={isStartWorkoutOpen} onOpenChange={setIsStartWorkoutOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Escolha um treino para iniciar</DialogTitle>
            </DialogHeader>
            {workoutsLoading ? (
              <div className="py-8 flex justify-center">
                <Skeleton className="h-10 w-full max-w-xs" />
                <Skeleton className="h-10 w-full max-w-xs mt-2" />
                <Skeleton className="h-10 w-full max-w-xs mt-2" />
              </div>
            ) : workouts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum treino disponível. Crie um treino em Meus Treinos.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
                {workouts.map((workout) => (
                  <li key={workout.id}>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-auto py-3"
                      onClick={() => handleStartWorkout(workout.id)}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="font-medium">{workout.name}</span>
                        <span className="text-muted-foreground text-xs">{workout.muscle_group}</span>
                      </div>
                      <Play className="h-4 w-4 shrink-0" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </DialogContent>
        </Dialog>

        {/* Alunos: 1ª linha = botão | 2ª linha = hero cards (3) | 3ª linha = ações (3) */}
        {!isAdmin && (
          <div className="space-y-4 sm:space-y-6">
            {/* 2ª linha: Nível, Peso Atual, Gasto Calórico Diário */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <LevelCard />
              <WeightCard />
              <BmrCard />
            </div>
            {/* 3ª linha: Minha Dieta, Meus Treinos, Relatórios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <NavLink to="/diet" className="no-underline">
                <Card className="card-hover h-full animate-fade-in">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Minha Dieta</CardTitle>
                    <IconWrap><Utensils className="h-4 w-4 text-muted-foreground" /></IconWrap>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Ver Dieta</div>
                    <p className="text-xs text-muted-foreground">Acompanhe seu plano alimentar</p>
                  </CardContent>
                </Card>
              </NavLink>
              <NavLink to="/workouts" className="no-underline">
                <Card className="card-hover h-full animate-fade-in">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meus Treinos</CardTitle>
                    <IconWrap><Dumbbell className="h-4 w-4 text-muted-foreground" /></IconWrap>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Ver Treinos</div>
                    <p className="text-xs text-muted-foreground">Acesse sua rotina de exercícios</p>
                  </CardContent>
                </Card>
              </NavLink>
              <NavLink to="/reports" className="no-underline">
                <Card className="card-hover h-full animate-fade-in">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Relatórios</CardTitle>
                    <IconWrap><BarChart3 className="h-4 w-4 text-muted-foreground" /></IconWrap>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Ver Análises</div>
                    <p className="text-xs text-muted-foreground">Visualize seu progresso com gráficos</p>
                  </CardContent>
                </Card>
              </NavLink>
            </div>
          </div>
        )}

        {/* Admin: cards originais */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <NavLink to="/students" className="no-underline">
              <Card className="card-hover h-full animate-fade-in">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gerenciar Dietas</CardTitle>
                  <IconWrap><Utensils className="h-4 w-4 text-muted-foreground" /></IconWrap>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Criar Dietas</div>
                  <p className="text-xs text-muted-foreground">Atribua planos alimentares aos alunos</p>
                </CardContent>
              </Card>
            </NavLink>
            <NavLink to="/workouts" className="no-underline">
              <Card className="card-hover h-full animate-fade-in">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Meus Treinos</CardTitle>
                  <IconWrap><Dumbbell className="h-4 w-4 text-muted-foreground" /></IconWrap>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Ver Treinos</div>
                  <p className="text-xs text-muted-foreground">Acesse sua rotina de exercícios</p>
                </CardContent>
              </Card>
            </NavLink>
            <Card className="card-hover animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
                <IconWrap><Users className="h-4 w-4 text-muted-foreground" /></IconWrap>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42</div>
                <p className="text-xs text-muted-foreground">+3 na última semana</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;