import { useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { useCalorieCalculator } from '@/hooks/useCalorieCalculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, ChevronDown, ChevronUp } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const BmrCard = ({ variant = 'default' }: { variant?: 'default' | 'hero' }) => {
  const { profile, loading: sessionLoading } = useSession();
  const { result, loading } = useCalorieCalculator();
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const isHero = variant === 'hero';

  const loadingState = sessionLoading || loading;
  const hasData = result && result.bmr > 0;

  if (loadingState) {
    return (
      <Card className={isHero ? 'hero-card h-full min-h-[180px] sm:min-h-[200px]' : ''}>
        <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isHero ? 'pb-3' : 'pb-2'}`}>
          <CardTitle className={isHero ? 'text-base font-medium' : 'text-sm font-medium'}>
            Gasto Calórico Diário
          </CardTitle>
          <div className="icon-circle">
            <Flame className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className={isHero ? 'h-12 w-32 mb-3' : 'h-8 w-24 mb-2'} />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`card-hover animate-fade-in h-full ${isHero ? 'hero-card min-h-[180px] sm:min-h-[200px]' : ''}`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isHero ? 'pb-3' : 'pb-2'}`}>
        <CardTitle className={isHero ? 'text-base font-medium' : 'text-sm font-medium'}>
          Gasto Calórico Diário
        </CardTitle>
        <div className="icon-circle">
          <Flame className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <>
            <div className={isHero ? 'text-4xl sm:text-5xl font-bold text-primary tracking-tight' : 'text-2xl font-bold text-primary'}>
              {Math.round(result!.gastoTotal)} <span className="text-lg sm:text-xl font-semibold text-muted-foreground">kcal</span>
            </div>
            <p className={`text-muted-foreground mt-1 ${isHero ? 'text-sm' : 'text-xs'}`}>
              Estimativa baseada em intensidade e duração
            </p>

            <Collapsible open={breakdownOpen} onOpenChange={setBreakdownOpen} className="mt-3">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {breakdownOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Ver detalhes (Basal, Locomoção, Treino)
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground border-t pt-2">
                  <li className="flex justify-between">
                    <span>Basal (BMR)</span>
                    <span className="font-medium text-foreground">{Math.round(result!.breakdown.basal)} kcal</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Locomoção (NEAT)</span>
                    <span className="font-medium text-foreground">{Math.round(result!.breakdown.locomocao)} kcal</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Treino (EAT)</span>
                    <span className="font-medium text-foreground">{Math.round(result!.breakdown.treino)} kcal</span>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </>
        ) : (
          <>
            <div className={isHero ? 'text-xl font-semibold' : 'text-lg font-semibold'}>Dados incompletos</div>
            <p className={`text-muted-foreground ${isHero ? 'text-sm mt-1' : 'text-xs'}`}>
              <NavLink to="/settings" className="text-primary hover:underline transition-colors">Preencha seus dados</NavLink> (altura, peso, idade, sexo) para calcular.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BmrCard;
