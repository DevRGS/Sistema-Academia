import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ConnectionErrorProps {
  onRetry: () => void;
  retryCount?: number;
  maxRetries?: number;
}

const ConnectionError = ({ onRetry, retryCount = 0, maxRetries = 3 }: ConnectionErrorProps) => {
  const canRetry = retryCount < maxRetries;

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Erro de Conexão
        </CardTitle>
        <CardDescription>
          Não foi possível conectar à planilha do Google Sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Muitas requisições</AlertTitle>
          <AlertDescription>
            O Google está limitando as requisições. Por favor, aguarde alguns segundos e tente novamente.
            {retryCount > 0 && (
              <span className="block mt-2">
                Tentativas: {retryCount}/{maxRetries}
              </span>
            )}
          </AlertDescription>
        </Alert>
        {canRetry ? (
          <Button onClick={onRetry} className="w-full" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Conectar Novamente
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Limite de tentativas atingido. Por favor, aguarde alguns minutos antes de tentar novamente.
            </p>
            <Button onClick={onRetry} className="w-full" variant="outline" disabled>
              <RefreshCw className="mr-2 h-4 w-4" />
              Aguardando...
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionError;

