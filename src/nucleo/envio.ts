/**
 * Envio — a travessia do pier ate a mesa de quem revisa.
 *
 * O pre-dado sai do aparelho e entra no Atlas como RASCUNHO
 * (`registros_rascunho`), nunca como registro selado. Quem sela e o escritorio,
 * depois de conferir e completar o que mora na gaveta dele.
 *
 * NAO PRECISOU DE BACKEND NOVO: os dois endpoints ja existiam no Atlas —
 * `POST /registros/rascunho` para o texto e `POST /documentos/upload/{ativo}`
 * para a foto. O segundo calcula o SHA-256 no SERVIDOR, sobre os bytes que
 * chegam; e por isso que a foto sobe SEM COMPRIMIR: o hash passa a ser do byte
 * que a camera produziu, e a decisao 3.3 do PRD se resolve sozinha.
 *
 * ORDEM IMPORTA: rascunho primeiro, fotos depois. A foto precisa existir
 * amarrada a alguma coisa; se o texto falhasse depois das fotos, o Atlas
 * ficaria com imagens soltas que ninguem sabe de onde vieram.
 */

import { FalhaApi, enviarFoto, criarRascunhoRemoto } from './api'
import { acharCategoria, fotosDoRascunho, salvarRascunho, type Rascunho } from './rascunho'

export type EstadoEnvio = 'guardado' | 'enviando' | 'enviado' | 'falhou'

export type ResultadoEnvio = {
  estado: EstadoEnvio
  /** Id do rascunho no Atlas, quando ja subiu. */
  remotoId?: string
  fotosEnviadas: number
  fotosTotal: number
  erro?: string
}

/**
 * Monta o `dados` jsonb que vai para o Atlas.
 *
 * Tudo que o colaborador capturou entra aqui CRU, com as chaves do proprio
 * Atlas (`troca_oleo`, `horimetro_saida`) — sem traduzir, sem interpretar e sem
 * completar. O painel recebe o pre-dado como ele saiu do pier; e o escritorio
 * que transforma isso em registro.
 *
 * `origem` e `client_id` vao junto porque o painel precisa saber que aquilo
 * veio do campo e nao foi digitado la — e porque um reenvio depois de sinal
 * instavel tem de ser reconhecivel como o mesmo servico.
 */
function montarDados(r: Rascunho, fotos: number) {
  return {
    ...(r.especificos || {}),
    horimetro: r.horimetro || undefined,
    condicao: r.condicao,
    origem: 'atlas-pre-data',
    client_id: r.clientId,
    capturado_em: r.abertoEm,
    capturado_por: r.matricula,
    fotos_no_aparelho: fotos,
  }
}

/**
 * Sobe um rascunho inteiro: texto e depois cada foto.
 *
 * Nao apaga nada do aparelho. O pre-dado fica guardado ate o escritorio
 * confirmar que recebeu — sumir do celular assim que sobe e apostar que nada
 * deu errado do outro lado.
 */
export async function enviarRascunho(
  r: Rascunho,
  token: string,
  aoAndar?: (p: ResultadoEnvio) => void,
): Promise<ResultadoEnvio> {
  const fotos = await fotosDoRascunho(r.id)
  const parcial: ResultadoEnvio = {
    estado: 'enviando',
    fotosEnviadas: 0,
    fotosTotal: fotos.length,
  }
  aoAndar?.(parcial)

  const categoria = acharCategoria(r.categoria)

  try {
    // Ja subiu antes? Reaproveita o id em vez de criar outro rascunho no
    // Atlas: uma tentativa que falhou nas FOTOS nao deve duplicar o texto.
    let remotoId = r.remotoId
    if (!remotoId) {
      const criado = await criarRascunhoRemoto(token, {
        ativo_id: r.ativoId,
        categoria: r.categoria,
        titulo: r.servico || categoria?.rotulo || 'Registro de campo',
        observacao: r.observacao || undefined,
        dados: montarDados(r, fotos.length),
        status: r.condicao,
      })
      remotoId = criado?.id
      if (remotoId) await salvarRascunho({ ...r, remotoId })
    }

    parcial.remotoId = remotoId

    for (const f of fotos) {
      if (f.enviada) {
        parcial.fotosEnviadas += 1
        aoAndar?.({ ...parcial })
        continue
      }
      await enviarFoto(token, r.ativoId, f.arquivo, f.nome, {
        tipo: 'foto',
        categoria: r.categoria,
        // O que amarra a foto ao pre-dado do lado do Atlas, ja que o upload de
        // documento nao conhece rascunho: a descricao carrega o client_id.
        descricao: `Atlas Pré-Data · ${categoria?.rotulo ?? r.categoria} · ${r.clientId}`,
      })
      parcial.fotosEnviadas += 1
      aoAndar?.({ ...parcial })
    }

    const fim: ResultadoEnvio = { ...parcial, estado: 'enviado' }
    await salvarRascunho({ ...r, remotoId, enviadoEm: new Date().toISOString() })
    aoAndar?.(fim)
    return fim
  } catch (e) {
    const erro =
      e instanceof FalhaApi
        ? e.tipo === 'rede'
          ? 'Sem conexão. Fica guardado e sobe sozinho depois.'
          : e.message
        : 'Não foi possível enviar agora.'
    const fim: ResultadoEnvio = { ...parcial, estado: 'falhou', erro }
    aoAndar?.(fim)
    return fim
  }
}
