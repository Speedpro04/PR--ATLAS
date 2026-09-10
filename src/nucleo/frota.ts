/**
 * Frota — PROVISORIA, so para a tela ter o que mostrar.
 *
 * A E2 substitui isto pelo download real dos `ativos` da Marina via
 * /api/v1, guardados no IndexedDB. O navegador nunca fala direto com o
 * Supabase: seria um segundo caminho de escrita no mesmo banco, com outra
 * regra de autorizacao (regra "uma porta so").
 *
 * Os barcos abaixo sao ficticios e existem apenas em desenvolvimento.
 */

export type Barco = {
  id: string
  nome: string
  marca: string
  modelo: string
  ano: number
}

const EXEMPLO: Barco[] = [
  { id: 'dev-1', nome: 'Maria Bonita', marca: 'Azimut', modelo: '55 Flybridge', ano: 2019 },
  { id: 'dev-2', nome: 'Vento Sul', marca: 'Ferretti', modelo: '450', ano: 2021 },
  { id: 'dev-3', nome: 'Alvorada', marca: 'Intermarine', modelo: '42', ano: 2016 },
  { id: 'dev-4', nome: 'Dona Inês', marca: 'Schaefer', modelo: '375', ano: 2020 },
  { id: 'dev-5', nome: 'Sete Mares', marca: 'Cimitarra', modelo: '380', ano: 2014 },
  { id: 'dev-6', nome: 'Boa Esperança', marca: 'Phantom', modelo: '303', ano: 2022 },
]

export function frotaLocal(): Barco[] {
  return import.meta.env.DEV ? EXEMPLO : []
}

export function acharBarco(id: string): Barco | undefined {
  return frotaLocal().find((b) => b.id === id)
}

/** Busca por nome, marca ou modelo. Sem acento e sem caixa — dedo grosso. */
export function buscar(barcos: Barco[], termo: string): Barco[] {
  const t = normalizar(termo)
  if (!t) return barcos
  return barcos.filter((b) =>
    normalizar(`${b.nome} ${b.marca} ${b.modelo}`).includes(t),
  )
}

function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
