/**
 * Sessao do colaborador — PROVISORIA.
 *
 * Guarda por enquanto no localStorage so o que a tela precisa para navegar.
 * A E2 troca isto por sessao Supabase de verdade (login por matricula, 7 dias,
 * refresh na sincronizacao) e o IndexedDB passa a guardar frota e fila.
 *
 * Nada aqui e prova de nada: quem assina o registro e o `created_by` que o
 * backend grava, nao este arquivo.
 */

const CHAVE_MARINA = 'atlas-campo:marina'
const CHAVE_SESSAO = 'atlas-campo:sessao'

export type Sessao = {
  matricula: string
  nome: string
  /** ISO. A sessao dura 7 dias (PRD 3.1). */
  entrouEm: string
}

/** Codigo da Marina: pedido uma unica vez, na primeira abertura (PRD 3.4). */
export function marinaVinculada(): string | null {
  try {
    return localStorage.getItem(CHAVE_MARINA)
  } catch {
    return null
  }
}

export function vincularMarina(codigo: string): void {
  try {
    localStorage.setItem(CHAVE_MARINA, codigo.trim().toUpperCase())
  } catch {
    /* modo privativo: segue sem guardar, a tela pede de novo */
  }
}

export function sessaoAtual(): Sessao | null {
  try {
    const cru = localStorage.getItem(CHAVE_SESSAO)
    if (!cru) return null
    const s = JSON.parse(cru) as Sessao
    return venceu(s) ? null : s
  } catch {
    return null
  }
}

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

export function venceu(s: Sessao): boolean {
  return Date.now() - new Date(s.entrouEm).getTime() > SETE_DIAS
}

export function abrirSessao(matricula: string, nome: string): Sessao {
  const s: Sessao = {
    matricula: matricula.trim(),
    nome,
    entrouEm: new Date().toISOString(),
  }
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s))
  } catch {
    /* idem */
  }
  return s
}

export function encerrarSessao(): void {
  try {
    localStorage.removeItem(CHAVE_SESSAO)
  } catch {
    /* idem */
  }
}
