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
        <CardDescription>Todos os seus registros de bioimpedância e antropometria.</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedData.length > 0 ? (
          <div className="overflow-x-auto"> {/* Added overflow for responsiveness */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Gordura (%)</TableHead>
                  <TableHead className="text-right">Músculo (kg)</TableHead>
                  <TableHead className="text-right">Massa Gorda (kg)</TableHead>
                  <TableHead className="text-right">Massa Magra (kg)</TableHead>
                  <TableHead className="text-right">Água (%)</TableHead>
                  <TableHead className="text-right">IMC</TableHead>
                  <TableHead className="text-right">TMB (kcal)</TableHead>
                  <TableHead className="text-right">Cintura (cm)</TableHead>
                  <TableHead className="text-right">Quadril (cm)</TableHead>
                  <TableHead className="text-right">Glúteos (cm)</TableHead>
                  <TableHead className="text-right">Coxa (cm)</TableHead>
                  <TableHead className="text-right">Panturrilha (cm)</TableHead>
                  <TableHead className="text-right">Bíceps (cm)</TableHead>
                  <TableHead className="text-right">Antebraço (cm)</TableHead>
                  <TableHead className="text-right">Peitoral (cm)</TableHead>
                  <TableHead className="text-right">Ombros (cm)</TableHead>
                  <TableHead className="text-right">Água Intra (%)</TableHead>
                  <TableHead className="text-right">Água Extra (%)</TableHead>
                  <TableHead className="text-right">Gordura Visceral</TableHead>
                  <TableHead className="text-right">Idade Metabólica</TableHead>
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
                    <TableCell className="text-right">{entry.fat_mass_kg?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.lean_mass_kg?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.total_body_water_percentage?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.bmi?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.basal_metabolic_rate_kcal?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.waist_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.hip_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.glutes_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.thigh_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.calf_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.biceps_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.forearm_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.chest_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.shoulders_cm?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.intracellular_water_percentage?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.extracellular_water_percentage?.toFixed(2) || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.visceral_fat_level || 'N/A'}</TableCell>
                    <TableCell className="text-right">{entry.metabolic_age || 'N/A'}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{entry.notes || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Nenhum registro de bioimpedância encontrado.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BioimpedanceHistoryList;