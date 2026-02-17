// Mapeamento de exercícios para GIFs de demonstração
// Os GIFs devem estar na pasta public/exercises/
export const exerciseGifs: { [key: string]: string } = {
  // Costas
  'Levantamento Terra': '/exercises/deadlift.gif',
  'Puxada Alta': '/exercises/lat-pulldown.gif',
  'Remada Curvada': '/exercises/barbell-row.gif',
  'Remada Serrote': '/exercises/dumbbell-row.gif',
  'Barra Fixa': '/exercises/pull-up.gif',
  'Remada Articulada': '/exercises/seated-row.gif',
  'Pulldown Polia': '/exercises/pulldown.gif',
  'Remada Baixa': '/exercises/cable-row.gif',
  'Hiperextensão': '/exercises/hyperextension.gif',
  
  // Pernas
  'Agachamento Livre': '/exercises/squat.gif',
  'Leg Press 45 Graus': '/exercises/leg-press.gif',
  'Stiff': '/exercises/stiff-leg-deadlift.gif',
  'Cadeira Extensora': '/exercises/leg-extension.gif',
  'Mesa Flexora': '/exercises/leg-curl.gif',
  'Elevação de Quadril': '/exercises/hip-thrust.gif',
  'Afundo': '/exercises/lunge.gif',
  'Hack Machine': '/exercises/hack-squat.gif',
  'Cadeira Abdutora': '/exercises/hip-abduction.gif',
  
  // Peito
  'Supino Reto com Barra': '/exercises/bench-press.gif',
  'Supino Inclinado com Halteres': '/exercises/incline-dumbbell-press.gif',
  'Peck Deck (Voador)': '/exercises/pec-deck.gif',
  'Cross Over (Polia Alta)': '/exercises/cable-crossover.gif',
  'Flexão de Braços': '/exercises/push-up.gif',
  'Paralelas': '/exercises/dips.gif',
  
  // Ombros
  'Desenvolvimento com Barra': '/exercises/shoulder-press.gif',
  'Elevação Lateral com Halteres': '/exercises/lateral-raise.gif',
  'Crucifixo Inverso na Máquina': '/exercises/rear-delt-fly.gif',
  'Elevação Frontal na Polia': '/exercises/front-raise.gif',
  'Face Pull': '/exercises/face-pull.gif',
  'Remada Alta com Barra': '/exercises/upright-row.gif',
  
  // Braços
  'Rosca Direta com Barra Reta': '/exercises/barbell-curl.gif',
  'Tríceps Testa com Barra': '/exercises/lying-tricep-extension.gif',
  'Rosca Martelo com Halteres': '/exercises/hammer-curl.gif',
  'Tríceps na Polia com Corda': '/exercises/tricep-pushdown.gif',
  'Rosca Concentrada': '/exercises/concentration-curl.gif',
  'Tríceps Mergulho no Banco': '/exercises/bench-dips.gif',
  
  // Core
  'Abdominal Crunch Solo': '/exercises/crunch.gif',
  'Prancha Isométrica': '/exercises/plank.gif',
  'Dead Bug (Inseto Morto)': '/exercises/dead-bug.gif',
  'Elevação de Pernas Suspenso': '/exercises/hanging-leg-raise.gif',
  'Bird-Dog (Cão-Pássaro)': '/exercises/bird-dog.gif',
  'Abdominal Roda (Ab Wheel)': '/exercises/ab-wheel.gif',
};

/**
 * Obtém a URL do GIF para um exercício específico
 * @param exerciseName Nome do exercício
 * @returns URL do GIF ou null se não encontrado
 */
export const getExerciseGif = (exerciseName: string): string | null => {
  if (!exerciseName) return null;

  // Tentar match exato primeiro
  if (exerciseGifs[exerciseName]) {
    return exerciseGifs[exerciseName];
  }

  // Tentar match parcial (case insensitive)
  const normalizedName = exerciseName.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(exerciseGifs)) {
    const normalizedKey = key.toLowerCase();
    
    // Verificar se o nome do exercício contém a chave ou vice-versa
    if (
      normalizedKey.includes(normalizedName) || 
      normalizedName.includes(normalizedKey) ||
      normalizedName === normalizedKey
    ) {
      return value;
    }
  }

  // Tentar match por palavras-chave comuns
  const keywords: { [key: string]: string } = {
    'supino': '/exercises/bench-press.gif',
    'agachamento': '/exercises/squat.gif',
    'levantamento terra': '/exercises/deadlift.gif',
    'barra fixa': '/exercises/pull-up.gif',
    'puxada': '/exercises/lat-pulldown.gif',
    'remada': '/exercises/barbell-row.gif',
    'rosca': '/exercises/barbell-curl.gif',
    'tríceps': '/exercises/tricep-pushdown.gif',
    'desenvolvimento': '/exercises/shoulder-press.gif',
    'elevação lateral': '/exercises/lateral-raise.gif',
    'flexão': '/exercises/push-up.gif',
    'abdominal': '/exercises/crunch.gif',
    'prancha': '/exercises/plank.gif',
  };

  for (const [keyword, gifUrl] of Object.entries(keywords)) {
    if (normalizedName.includes(keyword)) {
      return gifUrl;
    }
  }

  return null;
};

/**
 * Verifica se existe GIF disponível para um exercício
 */
export const hasExerciseGif = (exerciseName: string): boolean => {
  return getExerciseGif(exerciseName) !== null;
};

