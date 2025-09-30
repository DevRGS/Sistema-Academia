import { useSession } from '@/contexts/SessionContext';
import StudentList from '@/components/admin/StudentList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DietManagement from '@/components/admin/DietManagement';

const StudentsPage = () => {
  const { profile } = useSession();

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <UserCheck className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar alunos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
       <h1 className="text-3xl font-bold mb-6">Gerenciamento de Alunos</h1>
       <Tabs defaultValue="roles">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Funções</TabsTrigger>
          <TabsTrigger value="diets">Dietas</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>
                Visualize e gerencie as funções de todos os usuários cadastrados no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StudentList />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="diets">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Dietas</CardTitle>
              <CardDescription>
                Selecione um aluno para criar, visualizar ou editar seu plano de dieta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DietManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentsPage;