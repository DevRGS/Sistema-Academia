import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { Users, User } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';

type StudentSpreadsheet = {
  id: string;
  name: string;
  ownerEmail?: string;
};

const PersonalStudentList = () => {
  const { listStudents, switchToSpreadsheet, spreadsheetId, initialized } = useGoogleSheetsDB();
  const { user } = useSession();
  const [students, setStudents] = useState<StudentSpreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  const fetchStudents = async () => {
    if (!initialized) return;
    setLoading(true);
    try {
      const studentList = await listStudents();
      setStudents(studentList);
    } catch (error: any) {
      showError(error.message || 'Erro ao carregar lista de alunos.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized) {
      fetchStudents();
    }
  }, [initialized]);

  const handleSwitchToStudent = async (studentSpreadsheetId: string) => {
    if (studentSpreadsheetId === spreadsheetId) {
      showSuccess('Você já está visualizando esta planilha.');
      return;
    }

    setSwitching(studentSpreadsheetId);
    try {
      await switchToSpreadsheet(studentSpreadsheetId);
      showSuccess('Planilha do aluno carregada com sucesso! Agora você pode editar treinos e dietas deste aluno.');
      // Refresh students list to update current selection
      await fetchStudents();
      // Reload page to refresh all data with new spreadsheet
      window.location.reload();
    } catch (error: any) {
      showError(error.message || 'Erro ao alternar para planilha do aluno.');
      console.error(error);
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Meus Alunos
          </CardTitle>
          <CardDescription>
            Nenhum aluno compartilhou sua planilha com você ainda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Quando um aluno compartilhar sua planilha com seu e-mail ({user?.email}), ela aparecerá aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Meus Alunos ({students.length})
        </h2>
        <Button onClick={fetchStudents} variant="outline" size="sm">
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => (
          <Card key={student.id} className={student.id === spreadsheetId ? 'border-primary bg-primary/5' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {student.ownerEmail || 'Aluno'}
              </CardTitle>
              <CardDescription>
                Planilha: {student.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleSwitchToStudent(student.id)}
                disabled={switching === student.id || student.id === spreadsheetId}
                className="w-full"
                variant={student.id === spreadsheetId ? 'default' : 'outline'}
              >
                {switching === student.id
                  ? 'Carregando...'
                  : student.id === spreadsheetId
                  ? 'Visualizando'
                  : 'Visualizar Planilha'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PersonalStudentList;

