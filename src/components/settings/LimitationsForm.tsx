import { useState, useEffect } from 'react';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { loadLimitations, type Limitation } from '@/utils/exerciseService';
import { showSuccess, showError } from '@/utils/toast';
import { AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const LimitationsForm = () => {
  const { user, profile } = useSession();
  const { select, insert, update, initialized } = useGoogleSheetsDB();
  const [limitations, setLimitations] = useState<Limitation[]>([]);
  const [userLimitations, setUserLimitations] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const lims = await loadLimitations();
        setLimitations(lims);
        
        // Carregar limitações do usuário do perfil
        if (user && initialized) {
          const profiles = await select<{ limitations?: string }>('profiles', {
            eq: { column: 'id', value: user.id }
          });
          
          if (profiles.length > 0 && profiles[0].limitations) {
            try {
              const saved = typeof profiles[0].limitations === 'string' 
                ? JSON.parse(profiles[0].limitations)
                : profiles[0].limitations;
              setUserLimitations(saved);
            } catch {
              setUserLimitations({});
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar limitações:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (initialized) {
      loadData();
    }
  }, [user, initialized, select]);

  const handleToggle = (limitação: string) => {
    setUserLimitations(prev => ({
      ...prev,
      [limitação]: !prev[limitação]
    }));
  };

  const handleSave = async () => {
    if (!user || !initialized) return;

    try {
      const profiles = await select<{ id: string }>('profiles', {
        eq: { column: 'id', value: user.id }
      });

      const limitationsJson = JSON.stringify(userLimitations);

      if (profiles.length > 0) {
        await update('profiles', { limitations: limitationsJson }, {
          column: 'id',
          value: user.id
        });
      } else {
        await insert('profiles', {
          id: user.id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          role: profile?.role || 'student',
          email: user.email,
          limitations: limitationsJson,
        });
      }

      showSuccess('Limitações salvas com sucesso!');
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (error) {
      showError('Erro ao salvar limitações.');
      console.error(error);
    }
  };

  const getEstabilidadeBadge = (estabilidade: string) => {
    if (estabilidade === 'Nenhuma') {
      return <span className="text-muted-foreground">-</span>;
    }
    const color = estabilidade === 'Alta' ? 'bg-green-500' : estabilidade === 'Média' ? 'bg-yellow-500' : 'bg-red-500';
    return <Badge className={color}>{estabilidade}</Badge>;
  };

  const getAcaoBadge = (acao: string) => {
    const color = acao === 'Bloqueio Total' ? 'bg-red-500' : 'bg-yellow-500';
    return <Badge className={color}>{acao}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dicionário de Regras de Segurança</CardTitle>
        <CardDescription>
          Selecione suas limitações físicas. O sistema filtrará exercícios baseado nos limites máximos de estresse definidos para cada condição.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Cada limitação define thresholds (limites máximos) de estresse que você pode suportar. 
            Exercícios que excedam esses limites serão bloqueados ou marcados com aviso, dependendo da ação configurada.
          </AlertDescription>
        </Alert>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Limitação</TableHead>
                <TableHead>Coluna Alvo</TableHead>
                <TableHead className="text-center">Limite Máx. (1-5)</TableHead>
                <TableHead className="text-center">Carga Axial (1-5)</TableHead>
                <TableHead className="text-center">Estabilidade Mín.</TableHead>
                <TableHead className="text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {limitations.map((limitation) => (
                <TableRow key={limitation.limitação}>
                  <TableCell>
                    <Checkbox
                      checked={userLimitations[limitation.limitação] || false}
                      onCheckedChange={() => handleToggle(limitation.limitação)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {limitation.limitação}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{limitation.colunaAlvo}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{limitation.limiteMaximoPermitido}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {limitation.limiteCargaAxial !== null ? (
                      <Badge variant="secondary">{limitation.limiteCargaAxial}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {getEstabilidadeBadge(limitation.estabilidadeMinimaExigida)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getAcaoBadge(limitation.acao)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {Object.values(userLimitations).filter(Boolean).length} limitação(ões) selecionada(s)
          </div>
          <Button onClick={handleSave}>
            Salvar Limitações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LimitationsForm;
