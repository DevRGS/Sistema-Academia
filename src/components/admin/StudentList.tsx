import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '../ui/skeleton';

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'student';
};

const StudentList = () => {
  const { select, update, initialized, loading: dbLoading } = useGoogleSheetsDB();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    if (!initialized) return;
    setLoading(true);
    try {
      const data = await select<Profile>('profiles', { order: { column: 'first_name', ascending: true } });
      setProfiles(data);
    } catch (error) {
      showError('Erro ao buscar usuários.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized && !dbLoading) {
      fetchProfiles();
    }
  }, [initialized, dbLoading]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'student') => {
    if (!initialized) return;
    try {
      await update('profiles', { role: newRole }, { column: 'id', value: userId });
      showSuccess('Função atualizada com sucesso!');
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
    } catch (error) {
      showError('Falha ao atualizar a função.');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Função Atual</TableHead>
          <TableHead className="text-right">Alterar Função</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((profile) => (
          <TableRow key={profile.id}>
            <TableCell className="font-medium">{profile.first_name} {profile.last_name}</TableCell>
            <TableCell>
              <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                {profile.role === 'admin' ? 'Admin' : 'Aluno'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Select
                defaultValue={profile.role}
                onValueChange={(newRole: 'admin' | 'student') => handleRoleChange(profile.id, newRole)}
              >
                <SelectTrigger className="w-[180px] ml-auto">
                  <SelectValue placeholder="Definir função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Aluno</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default StudentList;