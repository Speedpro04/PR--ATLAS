/**
 * Frota — PROVISORIA, so para a tela ter o que mostrar.
 *
 * Os barcos abaixo sao os `ativos` reais da conta do Marcos no Supabase do
 * Atlas (projeto owzelkiyorumnlaycral), lidos em 10/09/2026 e copiados aqui a
 * mao para o app ter frota de verdade antes da E2.
 *
 * A E2 substitui isto pelo download via /api/v1, guardado no IndexedDB. O
 * navegador nunca fala direto com o Supabase: seria um segundo caminho de
 * escrita no mesmo banco, com outra regra de autorizacao (regra "uma porta so").
 */

export type Barco = {
  /** Id do ativo no Atlas. Legivel de proposito: YA-IATE-2022-A7F3. */
  id: string
  /** `nome_reg` no banco, e pode ser nulo — nem todo barco tem nome. */
  nome: string | null
  marca: string
  modelo: string
  ano: number
  motor: string | null
  motores: number | null
}

const AXOS_HUB: Barco[] = [
  {
    id: 'YA-IATE-2022-A7F3',
    nome: 'Aurora Austral',
    marca: 'Sunseeker',
    modelo: 'Predator 74',
    ano: 2022,
    motor: 'MAN V12-1400',
    motores: 2,
  },
  {
    id: 'YA-IATE-2015-3A38',
    nome: null,
    marca: 'Marlin Sea',
    modelo: 'Focus',
    ano: 2015,
    motor: 'Volvo Penta D6',
    motores: 2,
  },
]

export function frotaLocal(): Barco[] {
  return AXOS_HUB
}

export function acharBarco(id: string): Barco | undefined {
  return frotaLocal().find((b) => b.id === id)
}

/**
 * Como o barco aparece na tela. Sem nome registrado vale o id do ativo —
 * nunca "sem nome", que nao ajuda ninguem a escolher.
 */
export function rotularBarco(b: Barco): string {
  return b.nome ?? b.id
}

/** Marca e modelo, sem o ano — quem mostra descricao tambem mostra o ano. */
export function descreverBarco(b: Barco): string {
  return `${b.marca} ${b.modelo}`
}

/** Busca por nome, id, marca ou modelo. Sem acento e sem caixa — dedo grosso. */
export function buscar(barcos: Barco[], termo: string): Barco[] {
  const t = normalizar(termo)
  if (!t) return barcos
  return barcos.filter((b) =>
    normalizar(`${b.nome ?? ''} ${b.id} ${b.marca} ${b.modelo}`).includes(t),
  )
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
