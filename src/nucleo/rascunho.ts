/**
 * Rascunho de servico — o que o colaborador captura no barco.
 *
 * VIVE NO APARELHO. Nada aqui vai para `registros` do Atlas; a E4 e que sobe
 * isto para `registros_rascunho`, e quem sela e o escritorio. Enquanto nao
 * sobe, o dono do dado e o celular — e por isso salvar nunca pode falhar em
 * silencio.
 *
 * O QUE ENTRA E O QUE NAO ENTRA (PRD secao 2):
 * fica no barco so o que EXISTE la e SOME se ninguem registrar na hora — foto,
 * horimetro, o que foi feito, condicao observada. Valor, nota fiscal, numero da
 * OS, CNPJ e part number moram na gaveta do escritorio e sao preenchidos na
 * revisao. O rascunho chega INCOMPLETO DE PROPOSITO.
 *
 * As 13 categorias sao as mesmas fichas do Atlas (`src/fichas/servicos.json`,
 * gerado do `servicosCategorias.ts` pelo `npm run fichas`). Aqui ficam so os
 * rotulos curtos: o botao no pier nao cabe "Registrar Manutencao / Troca de
 * Consumiveis".
 */

import {
  LOJA_FOTOS,
  LOJA_RASCUNHOS,
  apagar,
  gravar,
  ler,
  lerPorIndice,
  lerTudo,
} from './db'

export type CategoriaChave =
  | 'manutencao' | 'operacao' | 'motor' | 'casco' | 'eletrica' | 'seguranca'
  | 'drenagem' | 'pintura' | 'interior' | 'velame' | 'sinistros' | 'seguro'
  | 'dossie'

export type Categoria = {
  chave: CategoriaChave
  /** Como aparece no botao. Curto: e um alvo de dedo, nao um titulo. */
  rotulo: string
  /** Uma linha do que cabe ali, para quem esta em duvida entre duas. */
  ajuda: string
  /** Nome do icone no lucide-react. */
  icone: string
}

/**
 * A ordem NAO e alfabetica: e a frequencia no chao da Marina.
 *
 * Manutencao e ida ao mar sao o dia a dia e ficam no alcance do polegar;
 * sinistro e seguro sao raros e ficam no fim. Lista ordenada por A-Z faz o
 * colaborador procurar todo dia o que ele usa todo dia.
 */
export const CATEGORIAS: Categoria[] = [
  { chave: 'manutencao', rotulo: 'Manutenção', ajuda: 'Óleo, filtros, impeller, zincos', icone: 'Wrench' },
  { chave: 'operacao', rotulo: 'Ida ao mar', ajuda: 'Saída, travessia, retorno', icone: 'Navigation' },
  { chave: 'motor', rotulo: 'Motor', ajuda: 'Propulsão, hélice, linha de eixo', icone: 'Cog' },
  { chave: 'casco', rotulo: 'Casco', ajuda: 'Estrutura, fundo, docagem', icone: 'Shield' },
  { chave: 'eletrica', rotulo: 'Elétrica', ajuda: 'Baterias, quadro, eletrônicos', icone: 'Zap' },
  { chave: 'seguranca', rotulo: 'Segurança', ajuda: 'Salvatagem, extintores, balsa', icone: 'LifeBuoy' },
  { chave: 'drenagem', rotulo: 'Drenagem', ajuda: 'Bombas de porão, alarmes', icone: 'Droplets' },
  { chave: 'pintura', rotulo: 'Pintura', ajuda: 'Gelcoat, polimento, antiincrustante', icone: 'Paintbrush' },
  { chave: 'interior', rotulo: 'Interior', ajuda: 'Estofados, ar, habitabilidade', icone: 'Sofa' },
  { chave: 'velame', rotulo: 'Velame', ajuda: 'Mastro, velas, cabos', icone: 'Sailboat' },
  // "ou falha" no rotulo de proposito: achar um problema e registrar sem ter
  // feito servico nenhum e caso de uso legitimo — e se o botao so disser
  // "Sinistro", o colaborador acha que aquilo e para batida grande e nao
  // registra a bomba que esta fazendo barulho.
  { chave: 'sinistros', rotulo: 'Sinistro ou falha', ajuda: 'Avaria, colisão, algo com defeito', icone: 'AlertTriangle' },
  { chave: 'seguro', rotulo: 'Seguro', ajuda: 'Apólice, vistoria da seguradora', icone: 'FileCheck' },
  { chave: 'dossie', rotulo: 'Documentação', ajuda: 'Documento do barco, certificado', icone: 'FileText' },
]

export function acharCategoria(chave: string): Categoria | undefined {
  return CATEGORIAS.find((c) => c.chave === chave)
}

/** Como o colaborador viu o motor ao terminar. Vira `status` no Atlas. */
export type Condicao = 'concluido' | 'atencao' | 'pendente'

export const CONDICOES: Array<{ valor: Condicao; rotulo: string; ajuda: string }> = [
  { valor: 'concluido', rotulo: 'Concluído', ajuda: 'Terminei e está bom' },
  { valor: 'atencao', rotulo: 'Atenção', ajuda: 'Fiz, mas tem algo a olhar' },
  { valor: 'pendente', rotulo: 'Pendente', ajuda: 'Falta terminar' },
]

export type Foto = {
  id: string
  rascunhoId: string
  /**
   * O arquivo como saiu da camera, SEM comprimir.
   *
   * A compressao entra na E4, no envio — e ali a decisao 3.3 do PRD (o SHA-256
   * e do original ou do comprimido?) precisa estar fechada. Guardar o original
   * mantem as duas saidas abertas; comprimir agora fecharia a porta antes de o
   * Marcos decidir, e sem ninguem perceber.
   */
  arquivo: Blob
  nome: string
  tamanho: number
  criadaEm: string
}

export type Rascunho = {
  id: string
  ativoId: string
  categoria: CategoriaChave
  /** O que foi feito, na lingua de quem fez. */
  servico: string
  /** Leitura do horimetro. Texto: o campo aceita vazio, e 0 e uma leitura. */
  horimetro: string
  condicao: Condicao
  observacao: string
  /** Quem capturou — a matricula, nao o uuid. */
  matricula: string
  usuarioId: string
  /** Congelado na ABERTURA da ficha: e a hora do servico, nao a do envio. */
  abertoEm: string
  atualizadoEm: string
  /**
   * Id gerado no aparelho, que sobe junto na E4.
   *
   * E ele que impede a fila de duplicar: reenviar o mesmo `clientId` nao cria
   * linha nova no Atlas. Sinal instavel reenvia sozinho, e sem isto o mesmo
   * servico entraria tres vezes.
   */
  clientId: string
  /** Contagem de fotos, para a lista nao precisar carregar Blob nenhum. */
  fotos: number
}

function novoId(): string {
  // crypto.randomUUID nao existe em WebView antigo de Android; o fallback
  // nao precisa ser criptografico, so unico dentro deste aparelho.
  const c = globalThis.crypto as Crypto | undefined
  if (c?.randomUUID) return c.randomUUID()
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function novoRascunho(
  ativoId: string,
  categoria: CategoriaChave,
  matricula: string,
  usuarioId: string,
): Rascunho {
  const agora = new Date().toISOString()
  return {
    id: novoId(),
    clientId: novoId(),
    ativoId,
    categoria,
    servico: '',
    horimetro: '',
    condicao: 'concluido',
    observacao: '',
    matricula,
    usuarioId,
    abertoEm: agora,
    atualizadoEm: agora,
    fotos: 0,
  }
}

export async function salvarRascunho(r: Rascunho): Promise<boolean> {
  return gravar(LOJA_RASCUNHOS, { ...r, atualizadoEm: new Date().toISOString() })
}

export async function lerRascunho(id: string): Promise<Rascunho | null> {
  return ler<Rascunho>(LOJA_RASCUNHOS, id)
}

/** Os mais recentes primeiro — o de agora e o que interessa. */
export async function listarRascunhos(): Promise<Rascunho[]> {
  const todos = await lerTudo<Rascunho>(LOJA_RASCUNHOS)
  return todos.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
}

export async function rascunhosDoAtivo(ativoId: string): Promise<Rascunho[]> {
  return (await listarRascunhos()).filter((r) => r.ativoId === ativoId)
}

/** Apaga o rascunho E as fotos dele. Foto orfa so ocupa espaco no aparelho. */
export async function descartarRascunho(id: string): Promise<void> {
  const fotos = await fotosDoRascunho(id)
  for (const f of fotos) await apagar(LOJA_FOTOS, f.id)
  await apagar(LOJA_RASCUNHOS, id)
}

export async function guardarFoto(rascunhoId: string, arquivo: Blob, nome: string): Promise<Foto | null> {
  const foto: Foto = {
    id: novoId(),
    rascunhoId,
    arquivo,
    nome,
    tamanho: arquivo.size,
    criadaEm: new Date().toISOString(),
  }
  const ok = await gravar(LOJA_FOTOS, foto)
  if (!ok) return null

  // A contagem vive no rascunho para a lista nao ter de abrir a loja de fotos.
  const r = await lerRascunho(rascunhoId)
  if (r) await salvarRascunho({ ...r, fotos: (r.fotos || 0) + 1 })
  return foto
}

export async function fotosDoRascunho(rascunhoId: string): Promise<Foto[]> {
  const fotos = await lerPorIndice<Foto>(LOJA_FOTOS, 'por_rascunho', rascunhoId)
  return fotos.sort((a, b) => a.criadaEm.localeCompare(b.criadaEm))
}

export async function apagarFoto(foto: Foto): Promise<void> {
  await apagar(LOJA_FOTOS, foto.id)
  const r = await lerRascunho(foto.rascunhoId)
  if (r) await salvarRascunho({ ...r, fotos: Math.max(0, (r.fotos || 1) - 1) })
}

/**
 * O que ainda falta para o rascunho valer.
 *
 * Lista vazia = pronto para enviar. NAO e validacao de formulario: e o
 * contrato minimo do que so existe no barco. Nota fiscal e valor NAO entram
 * aqui — quem cobra isso e a revisao, no escritorio, de quem tem o papel na
 * mao. Exigir do colaborador um dado que ele nao tem e o jeito mais rapido de
 * fazer ele parar de registrar.
 */
export function faltaNoRascunho(r: Rascunho): string[] {
  const falta: string[] = []
  if (!r.servico.trim()) falta.push('o que foi feito')
  if (!r.horimetro.trim()) falta.push('horímetro')
  if (!r.fotos) falta.push('ao menos uma foto')
  return falta
}
