import { Navigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const Login = () => {
  const { isAuthenticated, signIn, loading } = useSession();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, redirecting...');
      // Use navigate instead of window.location for better React Router integration
      // But since we're in Login component, we'll use Navigate component
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }

  const handleSignIn = async () => {
    try {
      setSigningIn(true);
      await signIn();
      // Navigation is handled in signIn function
    } catch (error: any) {
      console.error('Error signing in:', error);
      alert('Erro ao fazer login. Por favor, tente novamente. ' + (error.message || ''));
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Bem-vindo ao Black Academy</h2>
        <p className="text-center text-gray-600">
          Faça login com sua conta Google para continuar
        </p>
        <Button
          onClick={handleSignIn}
          disabled={loading || signingIn}
          className="w-full"
          size="lg"
        >
          {signingIn ? 'Entrando...' : 'Entrar com Google'}
        </Button>
      </div>
    </div>
  );
};

export default Login;
