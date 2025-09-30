import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dumbbell, Utensils, Weight, Users, UserPlus } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import AddStudentDialog from '@/components/admin/AddStudentDialog';
import BmrCard from '@/components/dashboard/BmrCard';

const Dashboard = () => {
  const { profile } = useSession();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Painel de Controle</h1>
        {isAdmin && (
          <Button onClick={() => setIsAddStudentDialogOpen(true)}>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!isAdmin && <BmrCard />}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Calorias Consumidas
            </CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,350</div>
            <p className="text-xs text-muted-foreground">
              Meta: 2,500 kcal
            </p>
          </CardContent>
        </Card>
        <NavLink to="/workouts" className="no-underline">
          <Card className="hover:bg-muted/80 transition-colors h-full">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
            <Weight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78.5 kg</div>
            <p className="text-xs text-muted-foreground">
              -0.5kg desde a última pesagem
            </p>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
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