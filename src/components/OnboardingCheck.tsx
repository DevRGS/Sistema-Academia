import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { useGoogleSheetsDB } from '@/hooks/useGoogleSheetsDB';
import OnboardingWizard from './onboarding/OnboardingWizard';
import WelcomeTutorial from './onboarding/WelcomeTutorial';
import { Skeleton } from '@/components/ui/skeleton';

const OnboardingCheck = () => {
  const { user, profile, loading: sessionLoading } = useSession();
  const { select, initialized, loading: dbLoading } = useGoogleSheetsDB();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsTutorial, setNeedsTutorial] = useState(false);
  const [checking, setChecking] = useState(true);

  // Timeout de segurança para garantir que checking seja false após um tempo máximo
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (checking) {
        console.warn('OnboardingCheck: Timeout de segurança ativado, forçando checking = false');
        setChecking(false);
      }
    }, 10000); // 10 segundos máximo

    return () => clearTimeout(timeout);
  }, [checking]);

  useEffect(() => {
    const checkProfile = async () => {
      console.log('OnboardingCheck: Verificando perfil...', {
        sessionLoading,
        dbLoading,
        initialized,
        hasUser: !!user
      });

      // Aguardar até que tudo esteja carregado
      if (sessionLoading || dbLoading || !initialized || !user) {
        console.log('OnboardingCheck: Aguardando carregamento...');
        return;
      }

      try {
        console.log('OnboardingCheck: Buscando perfil do usuário...', user.id);
        const profiles = await select<{
          height_cm?: number | string;
          weight_kg?: number | string;
          sex?: string;
          age?: number | string;
          routine?: string;
        }>('profiles', {
          eq: { column: 'id', value: user.id }
        });

        console.log('OnboardingCheck: Perfis encontrados:', profiles.length);

        if (profiles.length === 0) {
          // Usuário não tem perfil ainda
          console.log('OnboardingCheck: Nenhum perfil encontrado, precisa de onboarding');
          setNeedsOnboarding(true);
          setNeedsTutorial(false);
          setChecking(false);
          return;
        }

        const userProfile = profiles[0];
        console.log('OnboardingCheck: Perfil encontrado:', {
          height_cm: userProfile.height_cm,
          weight_kg: userProfile.weight_kg,
          sex: userProfile.sex,
          age: userProfile.age,
          routine: userProfile.routine
        });

        // Verificar se todos os campos obrigatórios estão preenchidos
        const hasRequiredFields = 
          userProfile.height_cm && 
          userProfile.weight_kg && 
          userProfile.sex && 
          userProfile.age && 
          userProfile.routine;

        console.log('OnboardingCheck: Campos obrigatórios completos?', hasRequiredFields);
        setNeedsOnboarding(!hasRequiredFields);
        
        // Verificar se precisa mostrar tutorial (apenas se onboarding foi concluído)
        if (hasRequiredFields) {
          const tutorialCompleted = localStorage.getItem('tutorial_completed');
          console.log('OnboardingCheck: Tutorial completado?', !!tutorialCompleted);
          // Só mostrar tutorial se não foi completado
          if (!tutorialCompleted) {
            setNeedsTutorial(true);
          } else {
            setNeedsTutorial(false);
          }
        } else {
          setNeedsTutorial(false);
        }
      } catch (error) {
        console.error('OnboardingCheck: Erro ao verificar perfil:', error);
        // Em caso de erro, permitir acesso (não bloquear o usuário)
        setNeedsOnboarding(false);
        setNeedsTutorial(false);
      } finally {
        console.log('OnboardingCheck: Finalizando verificação, checking = false');
        setChecking(false);
      }
    };

    checkProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, initialized, sessionLoading, dbLoading]);

  // Listener para quando onboarding é concluído
  useEffect(() => {
    const handleOnboardingCompleted = async (event: CustomEvent) => {
      console.log('Onboarding completed event received');
      
      // Aguardar um pouco para o perfil ser atualizado no banco
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Recarregar verificação do perfil
      if (user && initialized) {
        try {
          const profiles = await select<{
            height_cm?: number | string;
            weight_kg?: number | string;
            sex?: string;
            age?: number | string;
            routine?: string;
          }>('profiles', {
            eq: { column: 'id', value: user.id }
          });

          if (profiles.length > 0) {
            const userProfile = profiles[0];
            const hasRequiredFields = 
              userProfile.height_cm && 
              userProfile.weight_kg && 
              userProfile.sex && 
              userProfile.age && 
              userProfile.routine;

            setNeedsOnboarding(!hasRequiredFields);
            
            // Se tem todos os campos, verificar tutorial
            if (hasRequiredFields && event.detail?.showTutorial) {
              const tutorialCompleted = localStorage.getItem('tutorial_completed');
              if (!tutorialCompleted) {
                setNeedsTutorial(true);
              }
            }
          }
        } catch (error) {
          console.error('Erro ao verificar perfil após onboarding:', error);
        }
      }
    };

    // Listener para quando tutorial é concluído
    const handleTutorialCompleted = () => {
      console.log('Tutorial completed event received in OnboardingCheck');
      setNeedsTutorial(false);
    };

    window.addEventListener('onboardingCompleted', handleOnboardingCompleted as EventListener);
    window.addEventListener('tutorialCompleted', handleTutorialCompleted);
    
    return () => {
      window.removeEventListener('onboardingCompleted', handleOnboardingCompleted as EventListener);
      window.removeEventListener('tutorialCompleted', handleTutorialCompleted);
    };
  }, [user, initialized, select]);

  // Log do estado atual para debug
  console.log('OnboardingCheck: Estado atual', {
    checking,
    sessionLoading,
    dbLoading,
    needsOnboarding,
    needsTutorial,
    hasUser: !!user,
    initialized
  });

  // Mostrar loading enquanto verifica
  if (checking || sessionLoading || dbLoading) {
    console.log('OnboardingCheck: Mostrando loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
        </div>
      </div>
    );
  }

  // Se precisa de onboarding, mostrar o wizard
  if (needsOnboarding) {
    console.log('OnboardingCheck: Mostrando OnboardingWizard');
    return <OnboardingWizard />;
  }

  // Renderizar Outlet (rotas filhas) sempre (para que o dashboard apareça em background)
  // Se precisa mostrar tutorial, mostrar como overlay
  console.log('OnboardingCheck: Renderizando Outlet e tutorial?', needsTutorial);
  return (
    <>
      <Outlet />
      {needsTutorial && (
        <WelcomeTutorial 
          onComplete={() => {
            console.log('Tutorial completed, hiding tutorial...');
            // Marcar como completo no localStorage (já feito no componente, mas garantir)
            localStorage.setItem('tutorial_completed', 'true');
            // Atualizar estado
            setNeedsTutorial(false);
            // Disparar evento para garantir atualização
            window.dispatchEvent(new CustomEvent('tutorialCompleted'));
          }} 
        />
      )}
    </>
  );
};

export default OnboardingCheck;

