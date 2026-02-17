import { useWorkoutExpiration } from '@/hooks/useWorkoutExpiration';

/**
 * Componente que verifica automaticamente a expiração de treinos
 * 
 * Este componente deve ser renderizado no nível da aplicação para garantir
 * que a verificação seja feita sempre que o usuário acessa o app.
 * 
 * A verificação é EXCLUSIVAMENTE temporal (não baseada em quantidade de treinos).
 */
const WorkoutExpirationChecker = () => {
  useWorkoutExpiration();
  return null; // Componente invisível, apenas executa a lógica
};

export default WorkoutExpirationChecker;

