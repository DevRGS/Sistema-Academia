import { useState, useCallback } from 'react';

type RetryOptions = {
  maxAttempts?: number;
  delay?: number;
  onError?: (error: Error, attempt: number) => void;
};

/**
 * Hook para executar funções com retry automático
 * Evita requisições infinitas limitando o número de tentativas
 */
export const useRetry = () => {
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options: RetryOptions = {}
    ): Promise<T | null> => {
      const {
        maxAttempts = 3,
        delay = 1000,
        onError,
      } = options;

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          setIsRetrying(attempt > 1);
          const result = await fn();
          setIsRetrying(false);
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (onError) {
            onError(lastError, attempt);
          }

          // Se não for a última tentativa, aguarda antes de tentar novamente
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Backoff exponencial
          }
        }
      }

      setIsRetrying(false);
      console.warn(`Retry failed after ${maxAttempts} attempts:`, lastError);
      return null;
    },
    []
  );

  return { retry, isRetrying };
};

