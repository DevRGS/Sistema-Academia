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
import { BioimpedanceRecord } from '@/pages/BioimpedancePage';

const BioimpedanceHistoryList = ({ data }: { data: BioimpedanceRecord[] }) => {
  const sortedData = [...data].sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime()); // Sort by date descending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registros Anteriores</CardTitle>
        <CardDescription>Todos os seus registros de bioimpedância.</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">Gordura (%)</TableHead>
                <TableHead className="text-right">Músculo (kg)</TableHead>
                <TableHead className="text-right">Água (%)</TableHead>
                <TableHead>Notas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.record_date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="text-right">{entry.weight_kg?.toFixed(2) || 'N/A'}</TableCell>
                  <TableCell className="text-right">{entry.body_fat_percentage?.toFixed(2) || 'N/A'}</TableCell>
                  <TableCell className="text-right">{entry.muscle_mass_kg?.toFixed(2) || 'N/A'}</TableCell>
                  <TableCell className="text-right">{entry.water_percentage?.toFixed(2) || 'N/A'}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{entry.notes || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground">Nenhum registro de bioimpedância encontrado.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BioimpedanceHistoryList;