import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscar, frotaLocal } from '../nucleo/frota'
import { encerrarSessao, type Sessao } from '../nucleo/sessao'

/**
 * Tela 2 — Escolher o barco (PRD secao 6).
 *
 * E o unico momento em que o colaborador precisa PROCURAR alguma coisa, e por
 * isso tem uma tela inteira so para ela: lista grande, busca por nome, dedo
 * grosso. Ele nao digita o barco e nao cadastra — a frota vem do painel.
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
    <div className="min-h-[100dvh] pb-8 topo-seguro">
      <header className="px-6 pt-8 pb-6 md:px-10 mx-auto max-w-2xl lg:max-w-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="rotulo">Matrícula {sessao.matricula}</p>
            <h1 className="mt-3 text-2xl md:text-3xl font-light text-white">
              Qual barco?
            </h1>
          </div>
          <button
            onClick={() => {
              encerrarSessao()
              aoSair()
            }}
            className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black shrink-0 py-3"
          >
            Sair
          </button>
        </div>

        <div className="group mt-8">
          <label htmlFor="busca" className="rotulo mb-3">
            Buscar
          </label>
          <input
            id="busca"
            className="campo"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Nome, marca ou modelo"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </header>

      <main className="px-6 md:px-10 mx-auto max-w-2xl lg:max-w-none">
        {achados.length === 0 ? (
          <p className="mt-12 text-center text-sm text-white/30 leading-relaxed">
            {frota.length === 0
              ? 'Nenhum barco baixado ainda. Conecte no wi-fi da Marina uma vez.'
              : 'Nenhum barco com esse nome.'}
          </p>
        ) : (
          <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0 xl:grid-cols-3">
            {achados.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => navegar(`/barco/${b.id}`)}
                  className="cartao w-full text-left px-5 py-5 transition-colors hover:border-[#c5a059]/40"
                  style={{ minHeight: 'var(--toque-min)' }}
                >
                  <span className="block text-lg text-white">{b.nome}</span>
                  <span className="mt-2 block text-[10px] uppercase tracking-[0.3em] text-white/30 font-black">
                    {b.marca} {b.modelo} · {b.ano}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
