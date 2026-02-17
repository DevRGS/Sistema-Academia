import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dumbbell, Utensils, Users, UserPlus, Scale, BarChart3 } from "lucide-react"; // Import BarChart3 icon
import { NavLink } from "react-router-dom";
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Button } from '@/components/ui/button';
import AddStudentDialog from '@/components/admin/AddStudentDialog';
import BmrCard from '@/components/dashboard/BmrCard';
import WeightCard from '@/components/dashboard/WeightCard';
import { Skeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const { profile, loading: sessionLoading, user } = useSession();
  const { initialized, loading: dbLoading } = useGoogleSheetsDB();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
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

  // Mostrar loading enquanto não estiver pronto
  if (!isReady) {
    return (
      <div className="space-y-6">
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Painel de Controle</h1>
        {isAdmin && (
          <Button onClick={() => setIsAddStudentDialogOpen(true)} size="sm" className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Aluno
          </Button>
        )}
      </div>
      
      {isAdmin && (
        <AddStudentDialog
          isOpen={isAddStudentDialogOpen}
          setIsOpen={setIsAddStudentDialogOpen}
        />
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {!isAdmin && <BmrCard />}
        
        {isAdmin ? (
          <NavLink to="/students" className="no-underline">
            <Card className="card-hover h-full animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Gerenciar Dietas
                </CardTitle>
                <Utensils className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Criar Dietas</div>
                <p className="text-xs text-muted-foreground">
                  Atribua planos alimentares aos alunos
                </p>
              </CardContent>
            </Card>
          </NavLink>
        ) : (
          <NavLink to="/diet" className="no-underline">
            <Card className="card-hover h-full animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Minha Dieta
                </CardTitle>
                <Utensils className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Ver Dieta</div>
                <p className="text-xs text-muted-foreground">
                  Acompanhe seu plano alimentar
                </p>
              </CardContent>
            </Card>
          </NavLink>
        )}

        <NavLink to="/workouts" className="no-underline">
          <Card className="card-hover h-full animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Meus Treinos
              </CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ver Treinos</div>
              <p className="text-xs text-muted-foreground">
                Acesse sua rotina de exercícios
              </p>
            </CardContent>
          </Card>
        </NavLink>
        
        {!isAdmin && <WeightCard />}

        {/* Reports Card */}
        {!isAdmin && (
          <NavLink to="/reports" className="no-underline">
            <Card className="card-hover h-full animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Relatórios
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Ver Análises</div>
                <p className="text-xs text-muted-foreground">
                  Visualize seu progresso com gráficos
                </p>
              </CardContent>
            </Card>
          </NavLink>
        )}

        {isAdmin && (
          <Card className="card-hover animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Alunos Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground">
                +3 na última semana
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;