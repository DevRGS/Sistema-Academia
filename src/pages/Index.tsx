import { Navigate } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Página inicial - Redireciona baseado no estado de autenticação
 * 
 * - Se autenticado: redireciona para /dashboard
 * - Se não autenticado: redireciona para /login
 * 
 * Esta página só deve ser acessada por usuários autenticados com acesso aos dados.
 */
const Index = () => {
  const { isAuthenticated, loading } = useSession();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center max-w-2xl space-y-4">
          <Skeleton className="h-12 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
          <Skeleton className="h-10 w-48 mx-auto mt-8" />
        </div>
      </div>
    );
  }

  // Se autenticado, redirecionar para dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se não autenticado, redirecionar para login
  return <Navigate to="/login" replace />;
};

export default Index;