/**
 * IndexedDB do Atlas Pré-Data.
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

const BANCO = 'atlas-pre-data'
const VERSAO = 2

/**
 * Nomes que este banco ja teve.
 *
 * O app trocou de nome duas vezes em dois dias (Campo -> Service -> Pre-Data), e
 * cada troca renomeou o IndexedDB junto — quem tinha rascunho guardado abria o
 * app no dia seguinte com o aparelho vazio, sem erro nenhum na tela. Renomear
 * produto nao pode apagar o trabalho de quem estava no pier.
 */
const BANCOS_ANTIGOS = ['atlas-service', 'atlas-campo']

/** Barcos baixados do Atlas. Chave: o id do ativo (YA-IATE-2022-A7F3). */
export const LOJA_FROTA = 'frota'
/** Pares chave/valor de controle: quando a frota foi baixada, etc. */
export const LOJA_META = 'meta'
/** Rascunhos de servico capturados no barco. Chave: o id local do rascunho. */
export const LOJA_RASCUNHOS = 'rascunhos'
/**
 * Fotos, como Blob. Loja SEPARADA dos rascunhos de proposito.
 *
 * Uma foto de celular tem 2-5 MB; um rascunho de texto tem 2 kB. Guardar as
 * duas coisas juntas faria toda leitura da lista de rascunhos arrastar dezenas
 * de megabytes de imagem para a memoria so para desenhar um titulo.
 */
export const LOJA_FOTOS = 'fotos'

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
      if (!db.objectStoreNames.contains(LOJA_RASCUNHOS)) {
        db.createObjectStore(LOJA_RASCUNHOS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(LOJA_FOTOS)) {
        const fotos = db.createObjectStore(LOJA_FOTOS, { keyPath: 'id' })
        // Buscar "as fotos deste rascunho" sem varrer a loja inteira.
        fotos.createIndex('por_rascunho', 'rascunhoId', { unique: false })
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

/**
 * Grava um item numa loja com keyPath. Devolve false se nao deu.
 *
 * Ao contrario de `gravarMeta`, aqui a falha INTERESSA: e um rascunho ou uma
 * foto que o colaborador acabou de fazer, e engolir o erro faria o trabalho
 * dele sumir em silencio.
 */
export async function gravar<T>(loja: string, item: T): Promise<boolean> {
  try {
    await transacionar(loja, 'readwrite', (s) => s.put(item as any))
    return true
  } catch {
    return false
  }
}

/** Apaga um item por chave. */
export async function apagar(loja: string, chave: IDBValidKey): Promise<boolean> {
  try {
    await transacionar(loja, 'readwrite', (s) => s.delete(chave))
    return true
  } catch {
    return false
  }
}

/** Itens de uma loja que casam com um indice — ex.: fotos de um rascunho. */
export async function lerPorIndice<T>(
  loja: string,
  indice: string,
  valor: IDBValidKey,
): Promise<T[]> {
  try {
    const db = await abrir()
    return await new Promise<T[]>((resolver, rejeitar) => {
      const tx = db.transaction(loja, 'readonly')
      const pedido = tx.objectStore(loja).index(indice).getAll(valor)
      pedido.onsuccess = () => resolver(pedido.result ?? [])
      pedido.onerror = () => rejeitar(pedido.error)
    })
  } catch {
    return []
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

/**
 * Traz o conteudo de um banco de nome antigo, uma vez so.
 *
 * Roda em silencio e nunca derruba o app: se nao houver banco antigo, se ele
 * estiver vazio ou se o navegador recusar, o app segue com o que tem.
 */
export async function migrarBancosAntigos(): Promise<number> {
  let trazidos = 0
  for (const nome of BANCOS_ANTIGOS) {
    try {
      const antigo = await new Promise<IDBDatabase | null>((ok) => {
        // Sem versao: abre como esta. Se o banco nao existe, o navegador cria
        // um vazio — por isso a checagem de objectStoreNames logo abaixo.
        const q = indexedDB.open(nome)
        q.onsuccess = () => ok(q.result)
        q.onerror = () => ok(null)
        q.onblocked = () => ok(null)
      })
      if (!antigo) continue

      for (const loja of [LOJA_FROTA, LOJA_RASCUNHOS, LOJA_FOTOS]) {
        if (!antigo.objectStoreNames.contains(loja)) continue
        const itens = await new Promise<any[]>((ok) => {
          try {
            const p = antigo.transaction(loja, 'readonly').objectStore(loja).getAll()
            p.onsuccess = () => ok(p.result ?? [])
            p.onerror = () => ok([])
          } catch {
            ok([])
          }
        })
        for (const item of itens) {
          if (await gravar(loja, item)) trazidos += 1
        }
      }
      antigo.close()
      // Nao apaga o banco antigo: se a migracao tiver falhado pela metade, o
      // original ainda e a copia boa.
    } catch {
      /* banco antigo inacessivel: segue sem ele */
    }
  }
  return trazidos
}

/** Apaga o que e do colaborador. Chamado ao sair. */
export async function limparTudo(): Promise<void> {
  for (const loja of [LOJA_FROTA, LOJA_META, LOJA_RASCUNHOS, LOJA_FOTOS]) {
    try {
      await transacionar(loja, 'readwrite', (s) => s.clear())
    } catch {
      /* idem */
    }
  }
}
