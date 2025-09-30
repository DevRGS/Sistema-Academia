import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { NavLink } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";

const Index = () => {
  const { session } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Bem-vindo ao <span className="text-primary">FitTrack</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Sua jornada para uma vida mais saudável começa aqui. Monitore sua dieta, acompanhe seus treinos e veja sua evolução como nunca antes.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild>
            <NavLink to={session ? "/dashboard" : "/login"}>
              {session ? "Acessar Painel" : "Começar Agora"}
            </NavLink>
          </Button>
          <Button variant="outline">
            Saiba Mais
          </Button>
        </div>
      </div>
      <div className="absolute bottom-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;