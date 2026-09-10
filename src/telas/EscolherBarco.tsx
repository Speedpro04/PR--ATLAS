import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor, LogOut, Search } from 'lucide-react'
import { buscar, descreverBarco, frotaLocal, rotularBarco } from '../nucleo/frota'
import { encerrarSessao, MARINA, type Sessao } from '../nucleo/sessao'

/**
 * Tela 2 — Escolher o barco (PRD secao 6).
 *
 * E o unico momento em que o colaborador precisa PROCURAR alguma coisa, e por
 * isso tem uma tela inteira so para ela: lista grande, busca por nome, dedo
 * grosso. Ele nao digita o barco e nao cadastra — a frota vem do painel.
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
  const frota = useMemo(() => frotaLocal(), [])
  const achados = useMemo(() => buscar(frota, termo), [frota, termo])

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 pb-12 topo-seguro">
      <header>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Anchor size={20} className="text-white/30" />
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
                Qual barco?
              </h1>
            </div>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black ml-12">
              {MARINA} · Matrícula {sessao.matricula}
            </p>
          </div>

          <button
            onClick={() => {
              encerrarSessao()
              aoSair()
            }}
            className="btn-secundario md:w-auto md:px-8 flex items-center justify-center gap-3 self-start"
          >
            <LogOut size={16} />
            Sair
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
        {achados.length === 0 ? (
          <div className="text-center py-32 bg-white/[0.01] border border-white/5 rounded-sm">
            <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black">
              {frota.length === 0
                ? 'Nenhum barco baixado ainda'
                : 'Nenhum barco com esse nome'}
            </p>
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
                      {b.ano}
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
