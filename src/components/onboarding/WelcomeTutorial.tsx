import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Dumbbell, 
  Calendar, 
  BarChart3, 
  Settings, 
  X, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type TutorialStep = {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
};

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Bem-vindo ao Sistema de Academia!',
    description: 'Vamos te mostrar como usar todas as funcionalidades da plataforma.',
    icon: <Dumbbell className="h-12 w-12 text-primary" />,
    features: [
      'Gerencie seus treinos personalizados',
      'Acompanhe seu progresso',
      'Registre suas limitações físicas',
      'Visualize demonstrações de exercícios'
    ]
  },
  {
    title: 'Treinos Personalizados',
    description: 'Crie e gerencie seus treinos baseados no seu perfil e limitações.',
    icon: <Calendar className="h-12 w-12 text-primary" />,
    features: [
      'Treinos base (ABC, Inicial, Intermediário, Avançado)',
      'Treinos personalizados por grupo muscular',
      'Filtragem automática por limitações físicas',
      'Registro de séries e repetições durante o treino'
    ]
  },
  {
    title: 'Acompanhamento de Progresso',
    description: 'Monitore sua evolução com gráficos e relatórios detalhados.',
    icon: <BarChart3 className="h-12 w-12 text-primary" />,
    features: [
      'Histórico de treinos realizados',
      'Gráficos de evolução de peso',
      'Relatórios completos de desempenho'
    ]
  },
  {
    title: 'Configurações e Perfil',
    description: 'Personalize sua experiência e gerencie suas informações.',
    icon: <Settings className="h-12 w-12 text-primary" />,
    features: [
      'Atualize seus dados pessoais',
      'Configure suas limitações físicas',
      'Gerencie seus treinos base',
      'Visualize e edite seu perfil completo'
    ]
  }
];

const WelcomeTutorial = ({ onComplete }: { onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Marcar tutorial como visto
    localStorage.setItem('tutorial_completed', 'true');
    onComplete();
  };

  const handleFinish = () => {
    // Marcar tutorial como visto
    localStorage.setItem('tutorial_completed', 'true');
    onComplete();
  };

  const currentStepData = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border-2">
        <CardHeader className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <CardTitle className="text-2xl">Tutorial de Uso</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Passo {currentStep + 1} de {tutorialSteps.length}
              </span>
              <Badge variant="secondary">
                {Math.round(progress)}% completo
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Ícone e título */}
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className="p-4 rounded-full bg-primary/10">
              {currentStepData.icon}
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">{currentStepData.title}</h3>
              <CardDescription className="text-base">
                {currentStepData.description}
              </CardDescription>
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-3">
            {currentStepData.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          {/* Navegação */}
          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleSkip}
                size="lg"
              >
                Pular Tutorial
              </Button>
              <Button
                onClick={handleNext}
                size="lg"
                className="min-w-[150px]"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Começar
                  </>
                ) : (
                  <>
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Indicadores de passo */}
          <div className="flex justify-center gap-2 pt-4">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-primary w-8'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeTutorial;

