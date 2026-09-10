import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor, LogOut, RefreshCw, Search } from 'lucide-react'
import {
  buscar,
  descreverBarco,
  frotaGuardada,
  rotularBarco,
  sincronizarFrota,
  type Barco,
} from '../nucleo/frota'
import { encerrarSessao, MARINA, type Sessao } from '../nucleo/sessao'

/**
 * Tela 2 — Escolher o barco (PRD secao 6).
 *
 * E o unico momento em que o colaborador precisa PROCURAR alguma coisa, e por
 * isso tem uma tela inteira so para ela: lista grande, busca por nome, dedo
 * grosso. Ele nao digita o barco e nao cadastra — a frota vem do painel.
 *
 * A lista sai SEMPRE do aparelho, nunca da rede. O download roda por tras e
 * atualiza quando conseguir; enquanto isso a copia de ontem ja esta na tela.
 * Ninguem olha uma bolinha girando no pier esperando barco aparecer.
 *
 * O cabecalho segue o painel operacional do Atlas: icone, titulo em serifada
 * e subtitulo de 10px com tracking 0.4em recuado sob o titulo.
 */
export default function EscolherBarco({
  sessao,
  aoSair,
}: {
  sessao: Sessao
  aoSair: () => void
}) {
  const navegar = useNavigate()
  const [termo, setTermo] = useState('')
  const [frota, setFrota] = useState<Barco[] | null>(null)
  const [atualizando, setAtualizando] = useState(false)

  // Passo 1: o que ja esta no aparelho, imediatamente.
  useEffect(() => {
    let vivo = true
    frotaGuardada().then((b) => vivo && setFrota(b))
    return () => {
      vivo = false
    }
  }, [])

  // Passo 2: tenta atualizar por tras. Falhou? A tela nem fica sabendo — o que
  // esta guardado continua servindo.
  useEffect(() => {
    let vivo = true
    sincronizarFrota(sessao.token)
      .then((n) => {
        if (vivo && n > 0) frotaGuardada().then((b) => vivo && setFrota(b))
      })
      .catch(() => {
        /* sem rede: segue com a copia local */
      })
    return () => {
      vivo = false
    }
  }, [sessao.token])

  async function atualizarAgora() {
    if (atualizando) return
    setAtualizando(true)
    try {
      await sincronizarFrota(sessao.token)
      setFrota(await frotaGuardada())
    } catch {
      /* o botao volta ao normal; a lista continua a mesma */
    } finally {
      setAtualizando(false)
    }
  }

  const achados = useMemo(() => buscar(frota ?? [], termo), [frota, termo])
  const carregando = frota === null

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 pb-12 topo-seguro">
      <header>
        <div className="flex items-start justify-between gap-4 pb-8 border-b border-white/5">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Anchor size={20} className="text-white/30 shrink-0" />
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
                Qual barco?
              </h1>
            </div>
            {/* Duas linhas de proposito no celular: "MATRICULA 4471" com
                tracking 0.4em nao cabe ao lado do nome da Marina em 375px, e
                quebrar no meio do numero deixa o 4471 orfao. */}
            <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black ml-12 leading-relaxed">
              {MARINA}
              <span className="hidden md:inline"> · </span>
              <span className="block md:inline">Matrícula {sessao.matricula}</span>
            </p>
          </div>

          {/* Sair nao e a acao desta tela — escolher o barco e. No celular vira
              icone, para nao ficar maior que os proprios barcos. */}
          <button
            onClick={async () => {
              await encerrarSessao()
              aoSair()
            }}
            aria-label="Sair"
            className="shrink-0 flex items-center justify-center gap-3 rounded-sm border border-white/10 text-white/40 px-4 md:px-8 text-[10px] font-black uppercase tracking-[0.3em] transition-colors hover:text-white/80 hover:border-white/20"
            style={{ minHeight: 'var(--toque-min)', minWidth: 'var(--toque-min)' }}
          >
            <LogOut size={16} />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>

        <div className="group py-8">
          <label htmlFor="busca" className="rotulo mb-3">
            Buscar
          </label>
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/20"
            />
            <input
              id="busca"
              className="campo pl-14"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Nome, marca ou modelo"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
        </div>
      </header>

      <main>
        {carregando ? (
          // Silencio de proposito: ler o IndexedDB leva milissegundos, e um
          // "carregando" que pisca e pior que nada.
          <div className="py-32" aria-busy="true" />
        ) : achados.length === 0 ? (
          <div className="text-center py-24 bg-white/[0.01] border border-white/5 rounded-sm px-6">
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black leading-relaxed">
              {frota!.length === 0
                ? 'Nenhum barco no aparelho'
                : 'Nenhum barco com esse nome'}
            </p>
            {frota!.length === 0 && (
              <>
                <p className="mt-4 text-white/20 text-[10px] uppercase tracking-[0.2em] font-black leading-relaxed">
                  Chegue perto do wi-fi para baixar a frota
                </p>
                <button
                  onClick={atualizarAgora}
                  disabled={atualizando}
                  className="mt-8 inline-flex items-center justify-center gap-3 rounded-sm border border-white/10 text-white/50 px-8 text-[10px] font-black uppercase tracking-[0.3em] transition-colors hover:text-white/80 hover:border-white/20 disabled:opacity-40"
                  style={{ minHeight: 'var(--toque-min)' }}
                >
                  <RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} />
                  {atualizando ? 'Baixando…' : 'Baixar agora'}
                </button>
              </>
            )}
          </div>
        ) : (
          <ul className="grid gap-4 md:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {achados.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => navegar(`/barco/${encodeURIComponent(b.id)}`)}
                  className="w-full text-left bg-white/[0.02] border border-white/5 p-6 rounded-sm transition-colors hover:border-[#c5a059]/40"
                  style={{ minHeight: 'var(--toque-min)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Anchor size={20} className="text-[#c5a059]" />
                    <span className="text-[8px] uppercase tracking-widest text-white/30">
                      {b.ano || '—'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-white">{rotularBarco(b)}</div>
                  <div className="text-[9px] text-white/40 uppercase tracking-widest mt-1">
                    {descreverBarco(b)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
