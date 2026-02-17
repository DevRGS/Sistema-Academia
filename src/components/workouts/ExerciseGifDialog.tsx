import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getExerciseGif } from '@/utils/exerciseGifs';
import { Loader2, AlertCircle, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type ExerciseGifDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  exerciseName: string;
};

const ExerciseGifDialog = ({ isOpen, setIsOpen, exerciseName }: ExerciseGifDialogProps) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const gifUrl = getExerciseGif(exerciseName);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // Reset states when dialog closes
    if (!open) {
      setImageLoading(true);
      setImageError(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            {exerciseName}
          </DialogTitle>
          <DialogDescription className="text-base">
            Demonstração visual da execução correta do exercício
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg min-h-[300px]">
          {imageLoading && gifUrl && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando demonstração...</p>
            </div>
          )}
          
          {gifUrl && !imageError ? (
            <img 
              src={gifUrl} 
              alt={`Demonstração de ${exerciseName}`}
              className={`max-w-full max-h-[500px] rounded-lg shadow-lg transition-opacity duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: imageLoading ? 'none' : 'block' }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 text-center p-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <p className="font-semibold text-lg">Demonstração não disponível</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  O GIF de demonstração para este exercício ainda não está disponível. 
                  Estamos trabalhando para adicionar demonstrações visuais para todos os exercícios.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                className="mt-4"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>

        {gifUrl && !imageError && (
          <Alert className="mt-4 border-blue-500/50 bg-blue-500/5">
            <AlertDescription className="text-sm">
              <strong>Dica:</strong> Observe atentamente a postura, amplitude de movimento e velocidade de execução. 
              Execute o exercício com a mesma técnica demonstrada para garantir segurança e eficácia.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseGifDialog;

