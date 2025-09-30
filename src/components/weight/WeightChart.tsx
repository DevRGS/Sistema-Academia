import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type WeightEntry = {
  id: number;
  weight_kg: number;
  created_at: string;
};

const WeightChart = ({ data }: { data: WeightEntry[] }) => {
  const chartData = data
    .map(entry => ({
      date: new Date(entry.created_at),
      weight: entry.weight_kg,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Sort by date ascending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Peso</CardTitle>
        <CardDescription>Acompanhe sua evolução de peso ao longo do tempo.</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 10,
                  left: 10,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(value, 'dd/MM', { locale: ptBR })}
                  minTickGap={30}
                />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip
                  labelFormatter={(label) => format(label, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  formatter={(value: number) => [`${value} kg`, 'Peso']}
                />
                <Line type="monotone" dataKey="weight" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Nenhum dado de peso para exibir no gráfico.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default WeightChart;