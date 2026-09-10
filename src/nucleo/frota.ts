/**
 * Frota — os barcos da Marina, baixados do Atlas e guardados no aparelho.
 *
 * O colaborador nao digita e nao cadastra barco: ele escolhe. A Marina cadastra
 * uma vez no painel e registra servico nele por anos (PRD secao 2).
 *
 * OFFLINE PRIMEIRO: a tela sempre le do IndexedDB, nunca da rede. O download
 * roda por fora e atualiza o banco local; se falhar, a copia de ontem continua
 * valendo. Um barco a menos na lista e um problema pequeno perto de uma tela
 * vazia no meio do pier.
 */

import { listarAtivos } from './api'
import { LOJA_FROTA, gravarMeta, ler, lerTudo, substituirTudo, LOJA_META } from './db'

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

const CHAVE_SINCRONIA = 'frota:sincronizada-em'

/** O que a tela mostra. Sempre do aparelho. */
export async function frotaGuardada(): Promise<Barco[]> {
  const barcos = await lerTudo<Barco>(LOJA_FROTA)
  return barcos.sort(ordenar)
}

export async function sincronizadaEm(): Promise<string | null> {
  return ler<string>(LOJA_META, CHAVE_SINCRONIA)
}

/**
 * Baixa a frota e troca a copia local.
 *
 * Devolve quantos barcos vieram. Deixa a falha subir para quem chamou decidir:
 * a tela de frota engole (ja tem o que mostrar), e o login se importa.
 */
export async function sincronizarFrota(token: string): Promise<number> {
  const ativos = await listarAtivos(token)
  const barcos = ativos.map(converter).filter((b): b is Barco => b !== null)

  // Lista vazia NAO apaga o que esta guardado. Enquanto a E2-a nao existir, o
  // colaborador com conta propria recebe [] do /ativos — e trocar a frota por
  // uma lista vazia apagaria os barcos que ele ja tinha, por causa de um
  // buraco do backend.
  if (barcos.length === 0) return 0

  const gravou = await substituirTudo(LOJA_FROTA, barcos)
  if (gravou) await gravarMeta(CHAVE_SINCRONIA, new Date().toISOString())
  return barcos.length
}

/**
 * Ativo do Atlas -> barco da tela.
 *
 * So o que serve para ESCOLHER. O resto da ficha o app busca quando precisar:
 * guardar o ativo inteiro encheria o aparelho com dado que ninguem le no pier.
 *
 * Devolve null para linha sem id — sem id nao da para abrir o barco, e uma
 * linha morta na lista e pior que uma linha a menos.
 */
function converter(a: any): Barco | null {
  if (!a?.id) return null
  return {
    id: String(a.id),
    nome: a.nome_reg ? String(a.nome_reg) : null,
    marca: String(a.marca ?? ''),
    modelo: String(a.modelo ?? ''),
    ano: Number(a.ano_fabricacao) || 0,
    motor: a.modelo_motor ? String(a.modelo_motor) : null,
    motores: a.num_motores != null ? Number(a.num_motores) : null,
  }
}

/** Com nome primeiro, em ordem; os sem nome depois, pelo id. */
function ordenar(a: Barco, b: Barco): number {
  if (!!a.nome !== !!b.nome) return a.nome ? -1 : 1
  return rotularBarco(a).localeCompare(rotularBarco(b), 'pt-BR')
}

export async function acharBarco(id: string): Promise<Barco | null> {
  return ler<Barco>(LOJA_FROTA, id)
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
  return `${b.marca} ${b.modelo}`.trim()
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
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}
