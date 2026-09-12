/**
 * Cliente do backend do Atlas.
 *
 * UMA PORTA SO: tudo passa por /api/v1 (FastAPI). O navegador nunca fala com o
 * Supabase direto — seria um segundo caminho de escrita no mesmo banco, com
 * outra regra de autorizacao. Por isso o app tambem NAO carrega o supabase-js:
 * fora o peso no bundle, ter o cliente disponivel e um convite a usa-lo.
 *
 * NUNCA ESPERAR PELA REDE (PRD 3.1). Na borda do wi-fi o celular fica agarrado
 * a um sinal de uma barra e nao troca para o 4G: a requisicao nao volta nem da
 * erro, e o app trava com a bolinha girando. E o momento em que o colaborador
 * desiste. Toda chamada daqui tem prazo, e vencido o prazo vira falha de rede
 * comum — que a tela ja sabe tratar.
 */

const BASE = '/api/v1'

/** Leitura: some rapido. Quem esta no pier prefere a copia local a esperar. */
const PRAZO_LEITURA = 6000
/** Login: mais folgado. E a unica hora em que o colaborador espera de bom grado,
 *  e o backend pode estar acordando do sono. */
const PRAZO_LOGIN = 12000

export type TipoFalha =
  /** Sem rede, prazo vencido, servidor fora. Tentar de novo depois resolve. */
  | 'rede'
  /** Matricula ou senha errada. */
  | 'credenciais'
  /** Sessao vencida ou token invalido. Precisa entrar de novo. */
  | 'sessao'
  /** 402 — a Marina esta em atraso. Nao e culpa de quem esta segurando o celular. */
  | 'pagamento'
  /** Qualquer outra coisa que o servidor recusou. */
  | 'servidor'

export class FalhaApi extends Error {
  tipo: TipoFalha
  status: number

  constructor(tipo: TipoFalha, mensagem: string, status = 0) {
    super(mensagem)
    this.name = 'FalhaApi'
    this.tipo = tipo
    this.status = status
  }

  /** Vale a pena guardar e tentar de novo? */
  get temporaria(): boolean {
    return this.tipo === 'rede'
  }
}

/**
 * Tira os cabecalhos marcados como `undefined`.
 *
 * E como o upload pede para o navegador escolher o Content-Type: o FormData
 * precisa por o proprio, com o boundary, e um 'application/json' fixo aqui
 * faria o servidor recusar o arquivo.
 */
function limparCabecalhos(h: Record<string, string | undefined>): Record<string, string> {
  const saida: Record<string, string> = {}
  for (const [k, v] of Object.entries(h)) if (v !== undefined) saida[k] = v
  return saida
}

/**
 * Quem quer saber que a sessao caiu.
 *
 * Um so ouvinte, registrado pelo App. Tratar 401 em cada tela daria quatro
 * lugares para esquecer um.
 */
let ouvinteSessao: (() => void) | null = null

export function aoCairSessao(f: () => void): void {
  ouvinteSessao = f
}

async function chamar(
  caminho: string,
  opcoes: RequestInit & { prazo?: number; token?: string } = {},
): Promise<any> {
  const { prazo = PRAZO_LEITURA, token, headers, ...resto } = opcoes

  const abortador = new AbortController()
  const relogio = setTimeout(() => abortador.abort(), prazo)

  let resposta: Response
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      ...resto,
      signal: abortador.signal,
      headers: limparCabecalhos({
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers as Record<string, string | undefined>),
      }),
    })
  } catch {
    // AbortError e falha de rede caem no mesmo lugar de proposito: para quem
    // esta usando, "nao consegui falar com o servidor" é a mesma coisa.
    throw new FalhaApi('rede', 'Sem conexão com o Atlas.')
  } finally {
    clearTimeout(relogio)
  }

  if (resposta.ok) {
    // 204 e corpo vazio nao sao erro — /logout devolve assim.
    const texto = await resposta.text()
    if (!texto) return null
    try {
      return JSON.parse(texto)
    } catch {
      return texto
    }
  }

  const detalhe = await extrairDetalhe(resposta)

  if (resposta.status === 401) {
    // Avisa o App para derrubar ao login. So no 401 de uma chamada AUTENTICADA:
    // o 401 do proprio /auth/login e senha errada, e virou 'credenciais' antes
    // de chegar aqui.
    if (token) ouvinteSessao?.()
    throw new FalhaApi('sessao', detalhe || 'Sessão expirada.', 401)
  }
  if (resposta.status === 402) {
    throw new FalhaApi('pagamento', detalhe || 'Acesso da Marina suspenso.', 402)
  }
  if (resposta.status === 429) {
    throw new FalhaApi('rede', 'Muitas tentativas. Espere um pouco.', 429)
  }
  if (resposta.status >= 500) {
    // 5xx e temporario: o servidor caiu, nao o pedido. Tratar como rede faz a
    // fila da E4 guardar e tentar de novo, em vez de descartar.
    throw new FalhaApi('rede', 'O Atlas não respondeu.', resposta.status)
  }
  throw new FalhaApi('servidor', detalhe || 'Não foi possível completar.', resposta.status)
}

/** O FastAPI devolve `detail` como texto ou como objeto (o 402 manda um dicionario). */
async function extrairDetalhe(r: Response): Promise<string> {
  try {
    const corpo = await r.json()
    const d = corpo?.detail
    if (typeof d === 'string') return d
    if (d && typeof d === 'object') return d.mensagem || d.motivo || ''
    return ''
  } catch {
    return ''
  }
}

export type RespostaLogin = {
  access_token: string
  refresh_token: string
  /** O backend chama de `user`, mas manda o id. */
  user: string
}

/**
 * Entra no Atlas.
 *
 * O backend espera e-mail. Quem monta o endereco a partir da matricula e a
 * `sessao.ts` — aqui so trafega o que o /auth/login ja aceita.
 */
export async function entrar(email: string, senha: string): Promise<RespostaLogin> {
  try {
    return await chamar('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: senha }),
      prazo: PRAZO_LOGIN,
    })
  } catch (e) {
    // No login, 401 nao e "sessao vencida" — e senha errada. A tela precisa
    // dizer "matricula ou senha incorreta", nao "entre de novo".
    if (e instanceof FalhaApi && e.status === 401) {
      throw new FalhaApi('credenciais', 'Matrícula ou senha incorreta.', 401)
    }
    throw e
  }
}

/** Ativos que o usuario logado pode ver. Arquivados ficam de fora. */
export async function listarAtivos(token: string): Promise<any[]> {
  const dados = await chamar('/ativos', { token })
  return Array.isArray(dados) ? dados : []
}

/** Prazo do envio: mais folgado que a leitura, porque foto demora a subir. */
const PRAZO_ENVIO = 45000

/**
 * Cria o rascunho no Atlas (`registros_rascunho`).
 *
 * Devolve a linha criada, com o `id` do lado de la — e ele que permite reenviar
 * as fotos sem criar um segundo rascunho quando a primeira tentativa cai no
 * meio.
 */
export async function criarRascunhoRemoto(
  token: string,
  corpo: {
    ativo_id: string
    categoria: string
    titulo?: string
    observacao?: string
    dados: Record<string, unknown>
    status?: string
  },
): Promise<any> {
  return chamar('/registros/rascunho', {
    method: 'POST',
    body: JSON.stringify(corpo),
    token,
    prazo: PRAZO_ENVIO,
  })
}

/**
 * Sobe uma foto por `POST /documentos/upload/{ativo}`.
 *
 * O arquivo vai COMO SAIU DA CAMERA. O servidor calcula o SHA-256 sobre os
 * bytes recebidos, entao comprimir aqui mudaria a prova — e a decisao 3.3 do
 * PRD (qual byte e a prova) se resolve por nao mexer no arquivo.
 *
 * `FormData` manda o proprio Content-Type com o boundary; forcar
 * application/json aqui quebraria o upload, e por isso o header e removido.
 */
export async function enviarFoto(
  token: string,
  ativoId: string,
  arquivo: Blob,
  nome: string,
  meta: { tipo: string; categoria: string; descricao?: string },
): Promise<any> {
  const corpo = new FormData()
  corpo.append('file', arquivo, nome)

  // PENDENTE DE REVISAO, sempre. A foto tirada no pier chega antes de qualquer
  // conferencia: sem esta marca ela entra no Atlas como documento conferido,
  // some da aba Pre-Data (que lista so o que esta pendente) e vai parar no
  // dossie sem ninguem ter olhado. O parametro existe no backend exatamente
  // para isto e nunca era enviado — a trava estava pronta e desligada.
  const busca = new URLSearchParams({
    tipo: meta.tipo,
    categoria: meta.categoria,
    pendente_revisao: 'true',
  })
  if (meta.descricao) busca.set('descricao', meta.descricao)

  return chamar(`/documentos/upload/${encodeURIComponent(ativoId)}?${busca}`, {
    method: 'POST',
    body: corpo,
    token,
    prazo: PRAZO_ENVIO,
    // undefined remove o Content-Type padrao e deixa o navegador por o dele.
    headers: { 'Content-Type': undefined as unknown as string },
  })
}

/**
 * Quem esta logado, segundo o Atlas.
 *
 * Serve para uma coisa so: descobrir o NOME. O painel recebia
 * "kd3online@gmail.com" e um uuid no `created_by`, e ninguem no escritorio sabe
 * quem e isso — pre-dado sem nome de gente nao responde a primeira pergunta que
 * o revisor faz, que e "quem registrou isto?".
 */
export async function meusDados(token: string): Promise<any> {
  return chamar('/auth/me', { token })
}
