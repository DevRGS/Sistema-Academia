import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type WeightEntry = {
  id: number;
  weight_kg: number;
  created_at: string;
};

const WeightHistoryList = ({ data }: { data: WeightEntry[] }) => {
  const sortedData = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // Sort by date descending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros Anteriores</CardTitle>
        <CardDescription>Todos os seus registros de peso.</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</TableCell>
                  <TableCell className="text-right">{entry.weight_kg} kg</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground">Nenhum registro de peso encontrado.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default WeightHistoryList;