import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { acharBarco } from '../nucleo/frota'
import { marinaVinculada, type Sessao } from '../nucleo/sessao'

/**
 * Tela 3 — O fichario (PRD secao 6).
 *
 * O cabecalho VEM PREENCHIDO e o colaborador nao digita nada dele: quem fez,
 * matricula, dia, hora e barco o app ja sabe. Ele so confere — e se estiver
 * errado e porque entrou como outra pessoa, entao e bom que apareca grande.
 *
 * E justamente o que o escritorio precisa saber e o que ninguem consegue
 * reconstituir depois. Sai de graca.
 *
 * O corpo da ficha (categoria, fotos, horimetro) e a E3.
 */
export default function Fichario({ sessao }: { sessao: Sessao }) {
  const { id } = useParams()
  const navegar = useNavigate()
  const barco = id ? acharBarco(id) : undefined

  // Congelado na abertura da ficha: e a hora do servico, nao a do envio.
  const abertura = useMemo(() => new Date(), [])

  if (!barco) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-white/40">Barco não encontrado.</p>
          <button onClick={() => navegar('/')} className="btn-secundario mt-8">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const linhas: Array<[string, string]> = [
    ['Barco', barco.nome],
    ['Embarcação', `${barco.marca} ${barco.modelo} · ${barco.ano}`],
    ['Quem fez', sessao.nome],
    ['Matrícula', sessao.matricula],
    ['Dia', abertura.toLocaleDateString('pt-BR')],
    ['Hora', abertura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })],
    ['Marina', marinaVinculada() ?? '—'],
  ]

  return (
    <div className="min-h-[100dvh] pb-40 topo-seguro">
      <header className="px-6 pt-8 pb-6 md:px-10">
        <button
          onClick={() => navegar('/')}
          className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-black py-3"
        >
          ← Trocar barco
        </button>
        <h1 className="mt-4 text-2xl md:text-3xl font-light text-white">
          {barco.nome}
        </h1>
      </header>

      <main className="px-6 md:px-10 mx-auto max-w-2xl lg:max-w-none lg:grid lg:grid-cols-2 lg:gap-8">
        <section className="cartao px-5 py-6 md:px-6">
          <p className="rotulo mb-6">Conferir</p>
          <dl className="space-y-5">
            {linhas.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex items-baseline justify-between gap-4">
                <dt className="rotulo shrink-0">{rotulo}</dt>
                <dd className="text-base text-white text-right">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-sm leading-relaxed text-white/30">
            Isto o app já sabe. Se algum nome estiver errado, é porque a sessão
            é de outra pessoa.
          </p>
        </section>

        <section className="mt-6 cartao px-5 py-10 text-center lg:mt-0">
          <p className="rotulo">Próxima entrega</p>
          <p className="mt-5 text-sm leading-relaxed text-white/40">
            O que foi feito, as fotos e o horímetro entram na E3.
          </p>
        </section>
      </main>

      <div className="rodape-acao">
        <div className="mx-auto max-w-2xl lg:max-w-md">
        <button className="btn-primario" disabled>
          Salvar rascunho
        </button>
        </div>
      </div>
    </div>
  )
}
