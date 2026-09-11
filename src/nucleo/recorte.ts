/**
 * O recorte: quais campos de cada ficha do Atlas ficam no barco.
 *
 * As 13 fichas do Atlas somam 292 campos e 134 obrigatorios — formulario de
 * escritorio. Quem tenta preencher aquilo em pe, com a mao suja, ou desiste ou
 * preenche mentindo, e dado falso com aparencia de verdadeiro e pior que dado
 * faltando.
 *
 * O criterio esta no PRD (secao 2): fica no barco so o que EXISTE la e SOME se
 * ninguem registrar na hora. O resto — valor, nota fiscal, CNPJ, numero de OS,
 * part number — mora na gaveta do escritorio e entra na revisao.
 *
 * COMO ESTE ARQUIVO NASCE: `src/fichas/recorte.json` foi gerado por um passe de
 * classificacao campo a campo, seguido de um VERIFICADOR ADVERSARIAL cuja
 * tarefa era derrubar tudo que conseguisse. Onde o cetico passou, ele cortou
 * muito: motor caiu de 10 para 3 campos, manutencao de 23 para 13, e seguro
 * ficou em ZERO — apolice, vigencia e seguradora moram todas na gaveta.
 *
 * POR QUE SO ALGUMAS CATEGORIAS TEM CAMPO PROPRIO: nove das treze nao chegaram
 * a passar pelo cetico, e o numero delas esta visivelmente inflado (eletrica com
 * 25 campos, sinistros com 22). Usa-las assim colocaria no pier justamente o
 * formulario que este recorte existe para evitar. Elas seguem no formulario
 * curto ate serem verificadas — `verificado: false` no JSON.
 */

import bruto from '../fichas/recorte.json'

export type CampoRecorte = {
  key: string
  label: string
  type: string
  options?: string[] | null
  placeholder?: string | null
  suffix?: string | null
  showIf?: { key: string; equals: string } | null
  /** Por que ele some se nao for capturado na hora. Vira dica na tela. */
  porque?: string
}

type CategoriaRecorte = {
  verificado: boolean
  campos: CampoRecorte[]
  evidencias: Array<{ key: string; label: string; quando?: string }>
}

const CATEGORIAS = (bruto as any).categorias as Record<string, CategoriaRecorte>

/**
 * Campos proprios da categoria, ou lista vazia.
 *
 * Vazia tambem quando a categoria nao passou pelo cetico: nesse caso a tela
 * mostra so o formulario curto, que serve para qualquer servico.
 */
export function camposDaCategoria(chave: string): CampoRecorte[] {
  const c = CATEGORIAS[chave]
  if (!c || !c.verificado) return []
  return c.campos
}

export function categoriaVerificada(chave: string): boolean {
  return !!CATEGORIAS[chave]?.verificado
}

/**
 * Um campo com `showIf` so aparece quando o pai tem o valor esperado.
 *
 * E o que faz a ficha de manutencao caber no pier: os "houve troca de X?" sao
 * porteiros de um toque, e os detalhes de cada um so existem se a resposta for
 * sim. Sem isto, o colaborador encara treze campos de uma vez.
 */
export function campoVisivel(campo: CampoRecorte, valores: Record<string, string>): boolean {
  if (!campo.showIf) return true
  return valores[campo.showIf.key] === campo.showIf.equals
}

/** Evidencias que a categoria pede. */
export function evidenciasDaCategoria(chave: string): CategoriaRecorte['evidencias'] {
  return CATEGORIAS[chave]?.evidencias ?? []
}
