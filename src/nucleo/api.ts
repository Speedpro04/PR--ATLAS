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
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
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
