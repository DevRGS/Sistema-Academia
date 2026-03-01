/**
 * Sistema de gamificação: XP, níveis e nomes por gênero.
 * Escalável para futuras conquistas (badges).
 */

export const XP_POR_TREINO = 10;
export const XP_POR_DIETA = 5;

export type Genero = 'Masculino' | 'Feminino';

export const NIVEL_FAIXAS: { xpMin: number; xpMax: number; nomeM: string; nomeF: string }[] = [
  { xpMin: 0,    xpMax: 49,   nomeM: 'Frango',                nomeF: 'Franga' },
  { xpMin: 50,   xpMax: 149,  nomeM: 'Treino Fofo',           nomeF: 'Treino Fofo' },
  { xpMin: 150,  xpMax: 249,  nomeM: 'Treino Fofo-Mazo-menos', nomeF: 'Treino Fofo-Mazo-menos' },
  { xpMin: 250,  xpMax: 399,  nomeM: 'Peguei Gosto',          nomeF: 'Peguei Gosto' },
  { xpMin: 400,  xpMax: 599,  nomeM: 'Peguei o Esquema',      nomeF: 'Peguei o Esquema' },
  { xpMin: 600,  xpMax: 799,  nomeM: 'Faça Chuva/Faça Sol',   nomeF: 'Faça Chuva/Faça Sol' },
  { xpMin: 800,  xpMax: 999,  nomeM: 'MukiMuki',              nomeF: 'MukiMuki' },
  { xpMin: 1000, xpMax: 1299, nomeM: 'GymRat',                nomeF: 'GymRat' },
  { xpMin: 1300, xpMax: 1599, nomeM: 'Sócio da Academia',     nomeF: 'Sócia da Academia' },
  { xpMin: 1600, xpMax: Infinity, nomeM: 'Um cara Tranquilo', nomeF: 'Uma moça Tranquila' },
];

/**
 * Calcula XP total a partir de treinos e dietas registrados.
 */
export function getXp(totalTreinos: number, totalDietas: number): number {
  return totalTreinos * XP_POR_TREINO + totalDietas * XP_POR_DIETA;
}

/**
 * Retorna o nível (1–10) para um dado XP.
 */
export function getNivel(xp: number): number {
  const nivel = NIVEL_FAIXAS.findIndex(
    (faixa) => xp >= faixa.xpMin && xp <= faixa.xpMax
  );
  return nivel === -1 ? NIVEL_FAIXAS.length : nivel + 1;
}

/**
 * Retorna o nome do nível conforme o gênero.
 */
export function getNomeNivel(nivel: number, genero?: Genero | string | null): string {
  const idx = Math.max(0, Math.min(nivel - 1, NIVEL_FAIXAS.length - 1));
  const faixa = NIVEL_FAIXAS[idx];
  if (genero === 'Feminino') return faixa.nomeF;
  return faixa.nomeM;
}

export type ProgressoNivel = {
  xpAtual: number;
  xpMinNivelAtual: number;
  xpProximoNivel: number | null;
  porcentagemProgresso: number;
  nivel: number;
};

/**
 * Retorna dados de progresso dentro do nível atual (para barra e UI).
 */
export function getProgressoNivel(xp: number): ProgressoNivel {
  const nivel = getNivel(xp);
  const idx = nivel - 1;
  const faixa = NIVEL_FAIXAS[idx];
  const xpMinNivelAtual = faixa.xpMin;
  const proximaFaixa = NIVEL_FAIXAS[idx + 1];
  const xpProximoNivel = proximaFaixa ? proximaFaixa.xpMin : null;
  const range = xpProximoNivel !== null
    ? xpProximoNivel - xpMinNivelAtual
    : 1;
  const xpNoNivel = xp - xpMinNivelAtual;
  const porcentagemProgresso = xpProximoNivel === null
    ? 100
    : Math.min(100, Math.round((xpNoNivel / range) * 100));
  return {
    xpAtual: xp,
    xpMinNivelAtual: xpMinNivelAtual,
    xpProximoNivel: xpProximoNivel,
    porcentagemProgresso,
    nivel,
  };
}

const FRASES_MOTIVACIONAIS: string[] = [
  'Cada treino conta. Siga em frente!',
  'Consistência é o segredo. Você está no caminho.',
  'Dieta + treino = resultados. Continue assim!',
  'Nível subindo! Que dedicação.',
  'Foco e disciplina. Você manda nisso.',
  'Cada dia é uma nova chance de evoluir.',
  'Seu progresso inspira. Não pare.',
  'Pouco a pouco você vira referência.',
  'Quase no próximo nível. Bora!',
  'Você já é destaque. Só aumentar a conta.',
];

/**
 * Retorna uma frase motivacional dinâmica baseada em XP/nível.
 */
export function getFraseMotivacional(xp: number, nivel: number): string {
  const idx = Math.min(nivel - 1, FRASES_MOTIVACIONAIS.length - 1);
  return FRASES_MOTIVACIONAIS[idx] ?? FRASES_MOTIVACIONAIS[0];
}
