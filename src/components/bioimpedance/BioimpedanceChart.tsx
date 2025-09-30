import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BioimpedanceRecord } from '@/pages/BioimpedancePage';

const BioimpedanceChart = ({ data }: { data: BioimpedanceRecord[] }) => {
  const chartData = data
    .map(entry => ({
      date: new Date(entry.record_date),
      weight_kg: entry.weight_kg,
      body_fat_percentage: entry.body_fat_percentage,
      muscle_mass_kg: entry.muscle_mass_kg,
      water_percentage: entry.water_percentage,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date ascending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução da Bioimpedância</CardTitle>
        <CardDescription>Acompanhe suas métricas corporais ao longo do tempo.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(value, 'dd/MM', { locale: ptBR })}
                  minTickGap={30}
                />
                <YAxis yAxisId="left" label={{ value: 'Peso (kg) / Massa Muscular (kg)', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Percentual (%)', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  labelFormatter={(label) => format(label, 'dd/MM/yyyy', { locale: ptBR })}
                  formatter={(value: number, name: string) => {
                    let unit = '';
                    if (name === 'Peso (kg)' || name === 'Massa Muscular (kg)') unit = ' kg';
                    if (name === 'Gordura Corporal (%)' || name === 'Água Corporal (%)') unit = '%';
                    return [`${value?.toFixed(2)}${unit}`, name];
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="weight_kg" name="Peso (kg)" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="body_fat_percentage" name="Gordura Corporal (%)" stroke="#82ca9d" activeDot={{ r: 8 }} />
                <Line yAxisId="left" type="monotone" dataKey="muscle_mass_kg" name="Massa Muscular (kg)" stroke="#ffc658" activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" dataKey="water_percentage" name="Água Corporal (%)" stroke="#00bfff" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Nenhum dado de bioimpedância para exibir no gráfico.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default BioimpedanceChart;