/**
 * IndexedDB do Atlas Service.
 *
 * Sem biblioteca de proposito. `idb` e `dexie` custam 5-15 kB no bundle de um
 * app que abre no pier, e o que precisamos daqui e pequeno: guardar a frota e,
 * na E4, a fila de registros. IndexedDB cru resolve, e o custo e este arquivo.
 *
 * Por que IndexedDB e nao localStorage: a frota tem dezenas de barcos e a fila
 * da E4 vai guardar FOTO como Blob. localStorage so aceita texto, tem teto de
 * ~5 MB e e sincrono — travaria a tela no meio de um salvamento.
 *
 * Toda leitura devolve valor vazio em vez de estourar. Navegador em modo
 * privativo, cota cheia ou IndexedDB desligado nao podem derrubar o app: o
 * colaborador esta no pier e nao tem como resolver isso.
 */

const BANCO = 'atlas-service'
const VERSAO = 1

/** Barcos baixados do Atlas. Chave: o id do ativo (YA-IATE-2022-A7F3). */
export const LOJA_FROTA = 'frota'
/** Pares chave/valor de controle: quando a frota foi baixada, etc. */
export const LOJA_META = 'meta'

let conexao: Promise<IDBDatabase> | null = null

function abrir(): Promise<IDBDatabase> {
  if (conexao) return conexao

  const tentativa = new Promise<IDBDatabase>((resolver, rejeitar) => {
    if (typeof indexedDB === 'undefined') {
      return rejeitar(new Error('IndexedDB indisponivel'))
    }

    const pedido = indexedDB.open(BANCO, VERSAO)

    pedido.onupgradeneeded = () => {
      const db = pedido.result
      if (!db.objectStoreNames.contains(LOJA_FROTA)) {
        db.createObjectStore(LOJA_FROTA, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(LOJA_META)) {
        db.createObjectStore(LOJA_META)
      }
    }

    pedido.onsuccess = () => {
      const db = pedido.result
      // Outra aba pediu uma versao nova do banco. Fechar aqui evita travar a
      // atualizacao dela — e a proxima chamada reabre.
      db.onversionchange = () => {
        db.close()
        conexao = null
      }
      resolver(db)
    }

    pedido.onerror = () => rejeitar(pedido.error ?? new Error('Falha ao abrir o banco'))
  })

  // Nao guarda a promessa recusada: sem isto, uma falha momentanea condenaria
  // a sessao inteira a nunca mais tentar abrir o banco.
  conexao = tentativa.catch((e) => {
    conexao = null
    throw e
  })

  return conexao
}

function transacionar<T>(
  loja: string,
  modo: IDBTransactionMode,
  executar: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((resolver, rejeitar) => {
        const tx = db.transaction(loja, modo)
        const pedido = executar(tx.objectStore(loja))
        pedido.onsuccess = () => resolver(pedido.result)
        pedido.onerror = () => rejeitar(pedido.error ?? new Error('Falha na transacao'))
        tx.onabort = () => rejeitar(tx.error ?? new Error('Transacao abortada'))
      }),
  )
}

/** Tudo de uma loja. Lista vazia se o banco nao abrir. */
export async function lerTudo<T>(loja: string): Promise<T[]> {
  try {
    return (await transacionar<T[]>(loja, 'readonly', (s) => s.getAll())) ?? []
  } catch {
    return []
  }
}

/** Um valor por chave. `null` se nao existir ou se o banco nao abrir. */
export async function ler<T>(loja: string, chave: IDBValidKey): Promise<T | null> {
  try {
    const v = await transacionar<T | undefined>(loja, 'readonly', (s) => s.get(chave))
    return v ?? null
  } catch {
    return null
  }
}

/**
 * Troca o conteudo inteiro de uma loja, numa transacao so.
 *
 * Apagar e gravar precisam ser atomicos: se o app fechasse entre os dois, a
 * frota sumiria do aparelho e o colaborador abriria o app sem barco nenhum.
 * Devolve `false` quando nao deu para gravar — quem chamou decide o que dizer.
 */
export async function substituirTudo<T>(loja: string, itens: T[]): Promise<boolean> {
  try {
    const db = await abrir()
    return await new Promise<boolean>((resolver, rejeitar) => {
      const tx = db.transaction(loja, 'readwrite')
      const s = tx.objectStore(loja)
      s.clear()
      for (const item of itens) s.put(item)
      tx.oncomplete = () => resolver(true)
      tx.onerror = () => rejeitar(tx.error ?? new Error('Falha ao gravar'))
      tx.onabort = () => rejeitar(tx.error ?? new Error('Gravacao abortada'))
    })
  } catch {
    return false
  }
}

/** Grava um valor avulso na loja de controle. Silencioso se falhar. */
export async function gravarMeta(chave: string, valor: unknown): Promise<void> {
  try {
    await transacionar(LOJA_META, 'readwrite', (s) => s.put(valor, chave))
  } catch {
    /* sem espaco ou sem banco: o app segue, so nao lembra */
  }
}

/** Apaga o que e do colaborador. Chamado ao sair. */
export async function limparTudo(): Promise<void> {
  for (const loja of [LOJA_FROTA, LOJA_META]) {
    try {
      await transacionar(loja, 'readwrite', (s) => s.clear())
    } catch {
      /* idem */
    }
  }
}
