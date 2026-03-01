import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGamification } from '@/hooks/useGamification';
import { Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LevelCard() {
  const { nivel, nomeNivel, xp, progresso, fraseMotivacional, loading } = useGamification();

  if (loading) {
    return (
      <Card className="h-full animate-fade-in">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Nível</CardTitle>
          <div className="icon-circle">
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-3 w-full mb-4" />
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const xpProximoTexto =
    progresso.xpProximoNivel != null
      ? `${progresso.xpProximoNivel - progresso.xpAtual} XP para o próximo`
      : 'Nível máximo!';

  return (
    <Card className="card-hover h-full animate-fade-in overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Nível do Usuário</CardTitle>
        <div className="icon-circle">
          <Trophy className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-lg font-bold text-primary leading-tight">{nomeNivel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nível {nivel} · {xp} XP
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progresso.xpMinNivelAtual} XP</span>
            <span>{xpProximoTexto}</span>
          </div>
          <div
            className="h-2.5 w-full rounded-full bg-secondary overflow-hidden"
            role="progressbar"
            aria-valuenow={progresso.porcentagemProgresso}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progresso.porcentagemProgresso}%` }}
            />
          </div>
          <p className="text-right text-xs font-medium text-muted-foreground">
            {progresso.porcentagemProgresso}%
          </p>
        </div>
        <p className="text-xs text-muted-foreground italic leading-snug pt-0.5">
          {fraseMotivacional}
        </p>
      </CardContent>
    </Card>
  );
}
