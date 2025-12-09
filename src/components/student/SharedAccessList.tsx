import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { Users, X, User } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';

type SpreadsheetPermission = {
  id: string;
  emailAddress: string;
  role: string;
  displayName?: string;
};

const SharedAccessList = () => {
  const { listPermissions, removePermission, initialized } = useGoogleSheetsDB();
  const [permissions, setPermissions] = useState<SpreadsheetPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchPermissions = async () => {
    if (!initialized) return;
    setLoading(true);
    try {
      const perms = await listPermissions();
      setPermissions(perms);
    } catch (error: any) {
      showError(error.message || 'Erro ao carregar lista de permissões.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized) {
      // Add a small delay to avoid rate limiting
      const timer = setTimeout(() => {
        fetchPermissions();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [initialized]);

  // Listen for permission updates
  useEffect(() => {
    const handlePermissionsUpdate = () => {
      if (initialized) {
        // Add a small delay to avoid rate limiting
        setTimeout(() => {
          fetchPermissions();
        }, 500);
      }
    };
    window.addEventListener('permissionsUpdated', handlePermissionsUpdate);
    return () => window.removeEventListener('permissionsUpdated', handlePermissionsUpdate);
  }, [initialized]);

  const handleRemoveAccess = async (permissionId: string, email: string) => {
    setRemoving(permissionId);
    try {
      await removePermission(permissionId);
      showSuccess(`Acesso de ${email} removido com sucesso.`);
      await fetchPermissions();
    } catch (error: any) {
      showError(error.message || 'Erro ao remover acesso.');
      console.error(error);
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Acesso Compartilhado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Acesso Compartilhado
        </CardTitle>
        <CardDescription>
          Pessoas que têm acesso à sua planilha. Você pode remover o acesso a qualquer momento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguém tem acesso à sua planilha ainda. Use o botão "Compartilhar Planilha" acima para compartilhar.
          </p>
        ) : (
          <div className="space-y-3">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{permission.displayName || permission.emailAddress}</p>
                    <p className="text-sm text-muted-foreground">{permission.emailAddress}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {permission.role === 'writer' ? 'Editor' : permission.role}
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={removing === permission.id}
                    >
                      {removing === permission.id ? (
                        'Removendo...'
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Remover
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover Acesso?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover o acesso de <strong>{permission.emailAddress}</strong>?
                        Esta pessoa não poderá mais editar sua planilha.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemoveAccess(permission.id, permission.emailAddress)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover Acesso
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Button onClick={fetchPermissions} variant="outline" size="sm">
            Atualizar Lista
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharedAccessList;

