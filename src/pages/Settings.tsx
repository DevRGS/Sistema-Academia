import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import StudentDataForm from '@/components/student/StudentDataForm';
import ShareWithPersonalDialog from '@/components/student/ShareWithPersonalDialog';
import SharedAccessList from '@/components/student/SharedAccessList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Share2, Home } from 'lucide-react';

const SettingsPage = () => {
  const { profile, loading: sessionLoading } = useSession();
  const { initialized } = useGoogleSheetsDB();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const isStudent = profile?.role === 'student';

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
    </div>
  );
};

export default SettingsPage;