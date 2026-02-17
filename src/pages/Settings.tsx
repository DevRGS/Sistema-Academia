import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import StudentDataForm from '@/components/student/StudentDataForm';
import ShareWithPersonalDialog from '@/components/student/ShareWithPersonalDialog';
import SharedAccessList from '@/components/student/SharedAccessList';
import LimitationsForm from '@/components/settings/LimitationsForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Share2, Home, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showSuccess, showError } from '@/utils/toast';

const SettingsPage = () => {
  const { profile, loading: sessionLoading } = useSession();
  const { initialized, resetAndRecreateSheets, loading: dbLoading } = useGoogleSheetsDB();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const isStudent = profile?.role === 'student';

  const handleResetSheets = async () => {
    setIsResetting(true);
    try {
      await resetAndRecreateSheets();
      showSuccess('Abas resetadas e recriadas com sucesso! Recarregue a página para ver as mudanças.');
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      showError(`Erro ao resetar abas: ${error.message || 'Erro desconhecido'}`);
      console.error('Error resetting sheets:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <Button variant="outline" asChild>
          <NavLink to="/dashboard">
            <Home className="mr-2 h-4 w-4" /> Dashboard
          </NavLink>
        </Button>
      </div>
      <StudentDataForm />
      <LimitationsForm />
      
      {isStudent && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Compartilhar com Personal Trainer
              </CardTitle>
              <CardDescription>
                Compartilhe sua planilha com seu Personal Trainer para que ele possa editar seus treinos e dietas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShareDialogOpen(true)} disabled={!initialized}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar Planilha
              </Button>
              {!initialized && (
                <p className="text-sm text-muted-foreground mt-2">
                  Aguardando inicialização do banco de dados...
                </p>
              )}
            </CardContent>
          </Card>
          
          {initialized && <SharedAccessList />}
        </>
      )}
      
      <ShareWithPersonalDialog isOpen={shareDialogOpen} setIsOpen={setShareDialogOpen} />
      
      {/* Reset Sheets Card */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Área de Manutenção
          </CardTitle>
          <CardDescription>
            Use esta opção apenas se houver problemas com a estrutura das abas da planilha. 
            Esta ação irá deletar todas as abas existentes e recriar todas as abas com os cabeçalhos corretos.
            <strong className="block mt-2 text-destructive">ATENÇÃO: Esta ação não pode ser desfeita!</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={!initialized || dbLoading || isResetting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {isResetting ? 'Resetando...' : 'Zerar Dados e Configurar Abas'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Reset das Abas</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    <p>Esta ação irá:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Limpar o conteúdo de todas as abas existentes</li>
                      <li>Recriar todas as abas com os cabeçalhos corretos</li>
                      <li>Limpar o cache local</li>
                    </ul>
                    <strong className="block mt-4 text-destructive">
                      ATENÇÃO: Os dados existentes nas abas serão perdidos! Esta ação não pode ser desfeita.
                    </strong>
                    <p className="mt-2">
                      Você tem certeza que deseja continuar?
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleResetSheets}
                  disabled={isResetting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isResetting ? 'Resetando...' : 'Sim, Resetar Abas'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {!initialized && (
            <p className="text-sm text-muted-foreground mt-2">
              Aguardando inicialização do banco de dados...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;