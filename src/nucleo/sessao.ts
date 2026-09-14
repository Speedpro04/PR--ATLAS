/**
 * Sessao do colaborador (PRD 3.1 e 3.4).
 *
 * Entra uma vez, com rede, e o app fica aberto por 7 dias. E o que o WhatsApp
 * faz: tem login, e ninguem lembra de ter feito. O atrito nunca foi existir
 * senha — e digitar senha com a mao suja, em pe, toda vez.
 *
 * Onde mora: localStorage, nao IndexedDB. Sessao e um objeto pequeno lido na
 * primeira linha do App, e IndexedDB e assincrono — daria uma tela em branco
 * piscando antes de decidir entre login e frota. O supabase-js guarda no mesmo
 * lugar, pelo mesmo motivo.
 *
 * O que este arquivo NAO e: prova de nada. Quem assina o registro e o
 * `created_by` que o backend grava a partir do token, nao o que esta aqui.
 */

import { entrarComCodigo as apiEntrarComCodigo, entrar as apiEntrar, meusDados } from './api'
import { limparTudo } from './db'

const CHAVE = 'atlas-pre-data:sessao'
/** Chaves antigas: o app trocou de nome duas vezes. Ver db.ts. */
const CHAVES_ANTIGAS = ['atlas-service:sessao', 'atlas-campo:sessao']
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

/**
 * Uma Marina por enquanto.
 *
 * O vinculo aparelho-Marina e a E2-a, no repo do Atlas: hoje `profiles` nao tem
 * `marina_id` e `GET /ativos` filtra por dono do barco, entao um colaborador
 * com conta propria receberia lista vazia. Ate la o nome fica aqui, so para a
 * tela ter o que mostrar.
 */
export const MARINA = 'Marina Axos Hub'

/**
 * Dominio do e-mail sintetico montado a partir da matricula.
 *
 * O colaborador nunca ve este endereco: na tela dele sao matricula e senha. O
 * Supabase exige um e-mail, entao o app monta um — 4471 vira
 * 4471@campo.yachtsatlas.online.
 *
 * ENQUANTO A E2-a NAO EXISTE, o campo tambem aceita e-mail digitado direto
 * (qualquer coisa com "@"). E como se testa o caminho inteiro hoje, entrando
 * com a conta da propria Marina. Quando o cadastro de colaborador existir, a
 * matricula passa a funcionar e este atalho pode cair.
 */
const DOMINIO_MATRICULA = 'campo.yachtsatlas.online'

export type Sessao = {
  /** O que ele digitou: a matricula (ou o e-mail, no atalho de hoje). */
  matricula: string
  /** Id do usuario no Atlas. E ele que vira `created_by` no registro. */
  usuarioId: string
  /**
   * Nome de gente, para o painel nao mostrar uuid nem e-mail.
   *
   * Vem do `user_metadata` do Supabase via /auth/me. Pode faltar — conta sem
   * nome cadastrado existe — e ai o app cai no identificador, que ao menos e
   * legivel.
   */
  nome?: string
  token: string
  tokenRenovacao: string
  /** ISO. A sessao dura 7 dias (PRD 3.1). */
  entrouEm: string
}

export function identificadorParaEmail(entrada: string): string {
  const limpo = entrada.trim()
  if (limpo.includes('@')) return limpo.toLowerCase()
  return `${limpo.toLowerCase()}@${DOMINIO_MATRICULA}`
}

export function sessaoAtual(): Sessao | null {
  try {
    let cru = localStorage.getItem(CHAVE)
    // Renome do produto nao pode pedir login de novo.
    if (!cru) {
      for (const antiga of CHAVES_ANTIGAS) {
        const v = localStorage.getItem(antiga)
        if (v) {
          localStorage.setItem(CHAVE, v)
          localStorage.removeItem(antiga)
          cru = v
          break
        }
      }
    }
    if (!cru) return null
    const s = JSON.parse(cru) as Sessao
    // Guarda contra formato antigo: uma sessao gravada por uma versao anterior
    // do app nao tem token, e seguir com ela daria 401 em toda tela.
    if (!s?.token || !s?.entrouEm) return null
    return venceu(s) ? null : s
  } catch {
    return null
  }
}

export function venceu(s: Sessao): boolean {
  return Date.now() - new Date(s.entrouEm).getTime() > SETE_DIAS
}

/**
 * Entra de verdade, contra /api/v1/auth/login.
 *
 * Deixa a `FalhaApi` subir sem traduzir: a tela distingue senha errada
 * ('credenciais') de "estou sem sinal" ('rede'), e sao conversas diferentes
 * com quem esta segurando o celular.
 */
/**
 * Entrada pelo CÓDIGO DO APARELHO.
 *
 * A sessão fica igual à de sempre — token guardado do mesmo jeito, mesma fila,
 * mesmo envio. O que muda é o alcance: este token só serve para mandar
 * pré-dado. Selar registro, emitir dossiê e abrir o painel são recusados pelo
 * servidor, não escondidos pela tela.
 *
 * Não há refresh: o código vale sete dias e a Marina pode revogar a qualquer
 * momento. Quando vencer, o colaborador digita o código de novo — é um campo
 * só, e ele já tem o código anotado.
 */
export async function entrarComCodigo(codigo: string): Promise<Sessao> {
  const r = await apiEntrarComCodigo(codigo.trim())

  const s: Sessao = {
    matricula: r.apelido || 'Aparelho de campo',
    usuarioId: '',
    token: r.token,
    tokenRenovacao: '',
    entrouEm: new Date().toISOString(),
    nome: r.apelido,
  }
  guardar(s)
  return s
}

export async function entrar(identificador: string, senha: string): Promise<Sessao> {
  const r = await apiEntrar(identificadorParaEmail(identificador), senha)

  const s: Sessao = {
    matricula: identificador.trim(),
    usuarioId: r.user,
    token: r.access_token,
    tokenRenovacao: r.refresh_token,
    entrouEm: new Date().toISOString(),
  }

  // O nome e um extra: se o /auth/me falhar, a sessao vale do mesmo jeito.
  // Barrar a entrada porque o nome nao veio seria trocar um detalhe de
  // apresentacao pelo acesso inteiro.
  try {
    const eu = await meusDados(r.access_token)
    const m = eu?.user_metadata ?? eu?.userMetadata ?? {}
    s.nome = m.nome || m.full_name || m.name || eu?.nome || undefined
  } catch {
    /* segue sem nome */
  }

  guardar(s)
  return s
}

function guardar(s: Sessao): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(s))
  } catch {
    /* modo privativo: segue sem guardar, e a sessao morre ao fechar o app */
  }
}

/**
 * Sai e apaga o que e do colaborador — inclusive a frota.
 *
 * A frota e a lista de barcos de uma Marina; deixa-la no aparelho depois da
 * saida entregaria a carteira de clientes dela para o proximo que entrar.
 *
 * CUIDADO: isto apaga TAMBEM os rascunhos guardados. Quem chama precisa ter
 * perguntado antes — ver `pendentesDeEnvio()`. Um toque sem querer no icone de
 * sair nao pode custar o trabalho da manha de quem estava no pier.
 */
export async function encerrarSessao(): Promise<void> {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    /* idem */
  }
  await limparTudo()
}

/**
 * O token venceu no meio do uso.
 *
 * O access_token do Supabase dura cerca de uma hora, e o backend do Atlas ainda
 * NAO tem rota de refresh (E2-a, item 3) — no app principal quem renova e o
 * supabase-js, que este app nao carrega. Ate a rota existir, token vencido
 * derruba para o login.
 *
 * Isso NAO cumpre a 3.1 e e assumido como divida: os 7 dias so valem de fato
 * quando o refresh existir. A frota fica guardada, entao voltar custa a senha,
 * nao o download de novo.
 */
export function sessaoCaiu(): void {
  try {
    localStorage.removeItem(CHAVE)
    // O motivo da queda precisa sobreviver ao recarregamento: em memoria, um
    // F5 apaga o aviso e o colaborador ve um login limpo, sem saber por que
    // voltou para la — e conclui que o app o deslogou sozinho, de graca.
    localStorage.setItem(CHAVE_EXPIROU, '1')
  } catch {
    /* idem */
  }
}

const CHAVE_EXPIROU = 'atlas-pre-data:expirou'

/** Leu o aviso? Ele se apaga — vale para a proxima entrada, nao para sempre. */
export function consumirAvisoDeExpiracao(): boolean {
  try {
    const tem = localStorage.getItem(CHAVE_EXPIROU) === '1'
    if (tem) localStorage.removeItem(CHAVE_EXPIROU)
    return tem
  } catch {
    return false
  }
}

/**
 * Como o colaborador aparece na tela.
 *
 * Matricula sai com rotulo ("Matricula 4471"); e-mail sai so com a parte antes
 * do @ — "Matricula kd3online@gmail.com" e comprido e errado ao mesmo tempo,
 * porque e-mail nao e matricula, e com tracking largo estoura a coluna no
 * celular. Provisorio: quando a E2-a criar o cadastro, so chega matricula aqui.
 */
export function identificadorCurto(valor: string): string {
  const v = (valor || '').trim()
  if (v.includes('@')) return v.split('@')[0]
  return `Matrícula ${v}`
}
