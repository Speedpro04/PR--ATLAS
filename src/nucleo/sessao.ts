/**
 * Sessao do colaborador — PROVISORIA.
 *
 * Guarda no localStorage so o que a tela precisa para navegar. A E2 troca isto
 * por sessao Supabase de verdade (login por matricula, 7 dias, refresh na
 * sincronizacao) e o IndexedDB passa a guardar frota e fila.
 *
 * Nada aqui e prova de nada: quem assina o registro e o `created_by` que o
 * backend grava, nao este arquivo.
 */

const CHAVE_SESSAO = 'atlas-campo:sessao'

/**
 * Uma Marina por enquanto. Quando existirem duas com a mesma numeracao de
 * matricula, o aparelho precisa saber de qual ele e — e ai entra o vinculo,
 * na E2, vindo do painel. Nao antes: seria uma tela a mais no caminho de quem
 * so quer registrar um servico.
 */
export const MARINA = 'Marina Axos Hub'

export type Sessao = {
  matricula: string
  nome: string
  /** ISO. A sessao dura 7 dias (PRD 3.1). */
  entrouEm: string
}

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

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
    /* modo privativo: segue sem guardar, e a sessao morre ao fechar */
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
