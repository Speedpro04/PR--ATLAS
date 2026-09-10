import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, FileText, Ship } from 'lucide-react'
import { acharBarco, descreverBarco, rotularBarco } from '../nucleo/frota'
import { MARINA, type Sessao } from '../nucleo/sessao'

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
  const barco = id ? acharBarco(decodeURIComponent(id)) : undefined

  // Congelado na abertura da ficha: e a hora do servico, nao a do envio.
  const abertura = useMemo(() => new Date(), [])

  if (!barco) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black">
            Barco não encontrado
          </p>
          <button onClick={() => navegar('/')} className="btn-secundario mt-8">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const linhas: Array<[string, string]> = [
    ['Barco', rotularBarco(barco)],
    ['Embarcação', descreverBarco(barco)],
    ['Ativo', barco.id],
    ['Motor', barco.motor ? `${barco.motor}${barco.motores ? ` · ${barco.motores}x` : ''}` : '—'],
    ['Quem fez', sessao.nome],
    ['Matrícula', sessao.matricula],
    ['Dia', abertura.toLocaleDateString('pt-BR')],
    ['Hora', abertura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })],
    ['Marina', MARINA],
  ]

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 pb-40 topo-seguro">
      <header className="pb-8 border-b border-white/5">
        <button
          onClick={() => navegar('/')}
          className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black py-3 hover:text-white/60 transition-colors"
        >
          <ArrowLeft size={14} />
          Trocar barco
        </button>
        <div className="flex items-center gap-3 mt-4 mb-2">
          <Ship size={20} className="text-white/30" />
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
            {rotularBarco(barco)}
          </h1>
        </div>
        <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black ml-12">
          Rascunho de serviço · nada aqui é selado
        </p>
      </header>

      <main className="py-8 lg:grid lg:grid-cols-2 lg:gap-6">
        <section className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
          <div className="flex items-center justify-between mb-6">
            <ClipboardCheck size={20} className="text-[#c5a059]" />
            <span className="text-[8px] uppercase tracking-widest text-white/30">
              Conferir
            </span>
          </div>

          <dl className="space-y-5">
            {linhas.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex items-baseline justify-between gap-4">
                <dt className="rotulo shrink-0">{rotulo}</dt>
                <dd className="text-base text-white text-right">{valor}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">
            O app já sabe. Se um nome estiver errado, a sessão é de outra pessoa.
          </p>
        </section>

        <section className="mt-4 md:mt-6 lg:mt-0 bg-white/[0.01] border border-white/5 p-6 rounded-sm text-center py-20">
          <FileText size={20} className="text-white/20 mx-auto mb-5" />
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black">
            Próxima entrega
          </p>
          <p className="mt-4 text-[9px] text-white/40 uppercase tracking-widest leading-relaxed">
            O que foi feito · fotos · horímetro
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
