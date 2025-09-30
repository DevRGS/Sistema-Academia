import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .order('first_name');

    if (error) {
      showError('Erro ao buscar usuários.');
      console.error(error);
    } else {
      setProfiles(data as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'student') => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      showError('Falha ao atualizar a função.');
      console.error(error);
    } else {
      showSuccess('Função atualizada com sucesso!');
      // Update local state to reflect the change immediately
      setProfiles(profiles.map(p => p.id === userId ? { ...p, role: newRole } : p));
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