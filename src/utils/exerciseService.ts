// Serviço para gerenciar exercícios e limitações
export type Exercise = {
  exercicio: string;
  equipamento: string;
  grupo: string;
  subGrupo: string;
  musculoFoco: string;
  intensidadeFoco: number;
  musculoSubFoco: string;
  intensidadeSubFoco: number;
  musculoEstabilizador: string;
  intensidadeEstabilizador: number;
  cargaAxial: string;
  estresseLombar: number;
  estresseOmbro: number;
  estresseCotovelo: number;
  estressePunho: number;
  estresseJoelho: number;
  nivel: string;
  complexibilidade: number;
  estabilidade: string;
  tags: string;
  trocaJustadeExercicio: string;
};

export type Limitation = {
  limitação: string; // Nome da limitação
  colunaAlvo: string; // Coluna de estresse a monitorar
  limiteMaximoPermitido: number; // Valor máximo permitido (1-5)
  limiteCargaAxial: number | null; // Limite de carga axial (1-5) ou null se não aplicável
  estabilidadeMinimaExigida: string; // 'Alta', 'Média', 'Baixa' ou 'Nenhuma'
  acao: string; // 'Bloqueio Total' ou 'Aviso de Cuidado'
};

export type UserLimitations = {
  [key: string]: boolean; // Chave é a tag, valor indica se o usuário tem essa limitação
};

// Mapeamento de valores de texto para números
const mapEstresse = (value: string): number => {
  const map: { [key: string]: number } = {
    'Nula': 0,
    'Mínima': 1,
    'Baixa': 2,
    'Média': 3,
    'Alta': 4,
    'Altíssima': 5,
  };
  return map[value] ?? 0;
};

// Carregar exercícios do CSV
export const loadExercises = async (): Promise<Exercise[]> => {
  try {
    const csvUrl = `${import.meta.env.BASE_URL}EXERCICIOS-CONTROLE - exercicios.csv`;
    const response = await fetch(csvUrl);
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const exercises: Exercise[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV considerando valores entre aspas
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      if (values.length < headers.length) continue;
      
      const exercise: any = {};
      headers.forEach((header, index) => {
        let value = values[index] || '';
        
        // Tratar valores numéricos
        if (header === 'intensidadeFoco' || header === 'intensidadeSubFoco' || 
            header === 'intensidadeEstabilizador' || header === 'complexibilidade') {
          value = value ? Number(value) : 0;
        } else if (header === 'estresseLombar' || header === 'estresseOmbro' || 
                   header === 'estresseCotovelo' || header === 'estressePunho' || 
                   header === 'estresseJoelho') {
          // Converter texto para número
          value = mapEstresse(value);
        } else {
          value = value || '';
        }
        exercise[header] = value;
      });
      
      exercises.push(exercise as Exercise);
    }
    
    return exercises;
  } catch (error) {
    console.error('Erro ao carregar exercícios:', error);
    return [];
  }
};

// Carregar limitações do CSV
export const loadLimitations = async (): Promise<Limitation[]> => {
  try {
    const csvUrl = `${import.meta.env.BASE_URL}EXERCICIOS-CONTROLE - limitacoes.csv`;
    const response = await fetch(csvUrl);
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const limitations: Limitation[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV considerando valores entre aspas
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      
      if (values.length < headers.length) continue;
      
      // Mapear valores para o novo formato
      const limitação = values[0] || '';
      const colunaAlvo = values[1] || '';
      const limiteMaximoPermitido = values[2] ? Number(values[2]) : 5;
      const limiteCargaAxialStr = values[3]?.trim() || '';
      const limiteCargaAxial = limiteCargaAxialStr === 'Nenhuma' || limiteCargaAxialStr === '' ? null : Number(limiteCargaAxialStr);
      const estabilidadeMinimaExigida = values[4]?.trim() || 'Nenhuma';
      const acao = values[5]?.trim() || 'Bloqueio Total';
      
      limitations.push({
        limitação,
        colunaAlvo,
        limiteMaximoPermitido,
        limiteCargaAxial,
        estabilidadeMinimaExigida,
        acao,
      });
    }
    
    return limitations;
  } catch (error) {
    console.error('Erro ao carregar limitações:', error);
    return [];
  }
};

// Mapear estabilidade para valores numéricos para comparação
const mapEstabilidade = (value: string): number => {
  const map: { [key: string]: number } = {
    'Baixa': 1,
    'Média': 2,
    'Alta': 3,
  };
  return map[value] ?? 0;
};

// Filtrar exercícios baseado nas limitações do usuário
export const filterExercisesByLimitations = (
  exercises: Exercise[],
  userLimitations: UserLimitations,
  limitations: Limitation[]
): Exercise[] => {
  const activeLimitations = limitations.filter(lim => userLimitations[lim.limitação]);
  
  if (activeLimitations.length === 0) {
    return exercises;
  }
  
  return exercises.filter(exercise => {
    for (const limitation of activeLimitations) {
      const { 
        colunaAlvo, 
        limiteMaximoPermitido, 
        limiteCargaAxial, 
        estabilidadeMinimaExigida,
        acao 
      } = limitation;
      
      // Verificar a coluna alvo (estresse)
      let estresseValue: number = 0;
      if (colunaAlvo === 'Estresse Lombar') {
        estresseValue = exercise.estresseLombar;
      } else if (colunaAlvo === 'Estresse Ombro') {
        estresseValue = exercise.estresseOmbro;
      } else if (colunaAlvo === 'Estresse Cotovelo') {
        estresseValue = exercise.estresseCotovelo;
      } else if (colunaAlvo === 'Estresse Punho') {
        estresseValue = exercise.estressePunho;
      } else if (colunaAlvo === 'Estresse Joelho') {
        estresseValue = exercise.estresseJoelho;
      } else if (colunaAlvo === 'Estabilidade') {
        // Para estabilidade, verificamos se atende o mínimo exigido
        const exerciseEstabilidade = mapEstabilidade(exercise.estabilidade);
        const minRequired = mapEstabilidade(estabilidadeMinimaExigida);
        if (estabilidadeMinimaExigida !== 'Nenhuma' && exerciseEstabilidade < minRequired) {
          if (acao === 'Bloqueio Total') {
            return false;
          }
          // Para aviso de cuidado, continuamos mas marcamos (por enquanto bloqueamos também)
          return false;
        }
        continue; // Já verificamos estabilidade, passar para próxima limitação
      }
      
      // Verificar se o estresse excede o limite máximo permitido
      if (estresseValue > limiteMaximoPermitido) {
        if (acao === 'Bloqueio Total') {
          return false;
        }
        // Para aviso de cuidado, por enquanto também bloqueamos
        return false;
      }
      
      // Verificar carga axial se especificada
      if (limiteCargaAxial !== null) {
        const cargaAxialValue = mapEstresse(exercise.cargaAxial);
        if (cargaAxialValue > limiteCargaAxial) {
          if (acao === 'Bloqueio Total') {
            return false;
          }
          return false;
        }
      }
    }
    
    return true;
  });
};

// Grupos musculares disponíveis
export const MUSCLE_GROUPS = {
  'Costas': ['Latíssimo', 'Espessura', 'Cadeia Post.', 'Lombar'],
  'Pernas': ['Quadríceps', 'Posterior', 'Glúteos'],
  'Peito': ['Peitoral Médio', 'Peitoral Superior', 'Peitoral Inferior', 'Geral'],
  'Ombros': ['Deltoide Anterior', 'Deltoide Lateral', 'Deltoide Posterior', 'Trapézio/Deltoide'],
  'Braços': ['Bíceps', 'Tríceps'],
  'Core': ['Flexores de Tronco', 'Estabilização', 'Flexores de Quadril'],
};

export type MuscleGroupFocus = {
  [key: string]: number; // Porcentagem de foco em cada grupo
};

