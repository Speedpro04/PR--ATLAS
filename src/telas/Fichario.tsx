import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, FileText, Ship } from 'lucide-react'
import { acharBarco, descreverBarco, rotularBarco, tamanhoEmPes, type Barco } from '../nucleo/frota'
import { identificadorCurto, MARINA, type Sessao } from '../nucleo/sessao'

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

  // O barco agora vem do IndexedDB, que e assincrono. `undefined` e "ainda
  // procurando"; `null` e "procurei e nao achou" — a diferenca importa, porque
  // mostrar "Barco nao encontrado" durante a busca acusa um erro que nao houve.
  const [barco, setBarco] = useState<Barco | null | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    if (!id) return setBarco(null)
    acharBarco(decodeURIComponent(id)).then((b) => vivo && setBarco(b))
    return () => {
      vivo = false
    }
  }, [id])

  // Congelado na abertura da ficha: e a hora do servico, nao a do envio.
  const abertura = useMemo(() => new Date(), [])

  if (barco === undefined) {
    return <div className="min-h-[100dvh]" aria-busy="true" />
  }

  if (!barco) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/30 text-[10px] uppercase tracking-[0.3em] font-black">
            Ativo não encontrado
          </p>
          <button onClick={() => navegar('/')} className="btn-secundario mt-8">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const linhas: Array<[string, string]> = [
    // "Nome" so entra quando existe. Sem nome registrado `rotularBarco` devolve
    // o proprio id, e a ficha repetia YA-IATE-2015-3A38 em duas linhas seguidas
    // com rotulos diferentes — quem confere para de confiar na ficha inteira.
    ...(barco.nome ? ([['Nome', barco.nome]] as Array<[string, string]>) : []),
    // Sem o ano: ele ja tem linha propria, e "Sunseeker Predator 74 · 2022"
    // quebra em 375px deixando o "· 2022" orfao na segunda linha.
    ['Embarcação', descreverBarco(barco)],
    // O porte e como se fala do barco na marina — vem antes do ano.
    ['Porte', tamanhoEmPes(barco) ?? '—'],
    ['Ano', String(barco.ano)],
    ['Ativo', barco.id],
    ['Motor', barco.motor ? `${barco.motor}${barco.motores ? ` · ${barco.motores}x` : ''}` : '—'],
    // O nome do colaborador so existe quando a E2-a criar o cadastro dele; o
    // /auth/login devolve apenas o id. Ate la vale a matricula, que e o que
    // ele reconhece como sendo dele — nunca o uuid, que nao diz nada a
    // ninguem no pier. Sem o dominio: "kd3online@gmail.com" com tracking largo
    // estoura a coluna no celular.
    ['Quem fez', identificadorCurto(sessao.matricula)],
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
          Trocar ativo
        </button>
        <div className="flex items-center gap-3 mt-4 mb-2">
          <Ship size={20} className="text-[#c5a059]" />
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
            {rotularBarco(barco)}
          </h1>
        </div>
        <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black ml-12">
          Rascunho de serviço · nada aqui é selado
        </p>
      </header>

      {/* Duas colunas ja no tablet em pe: em coluna unica a 768px sobram 700px
          entre o rotulo e o valor, e os dois deixam de parecer da mesma linha.
          E o que o painel do Atlas faz com os cartoes dele em md. */}
      <main className="py-8 md:grid md:grid-cols-2 md:gap-6">
        <section className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
          <div className="flex items-center justify-between mb-6">
            <ClipboardCheck size={20} className="text-[#c5a059]" />
            <span className="text-[8px] uppercase tracking-widest text-white/30">
              Conferir
            </span>
          </div>

          <dl className="space-y-5">
            {/* O rotulo cede o tracking largo quando a coluna aperta; o valor
                nunca quebra. Rotulo apertado ainda se le; "Sunseeker Predator
                / 74" em duas linhas parece defeito. */}
            {linhas.map(([rotulo, valor]) => (
              <div key={rotulo} className="flex items-baseline justify-between gap-4">
                <dt className="rotulo shrink min-w-0 tracking-[0.2em] md:tracking-[0.3em]">
                  {rotulo}
                </dt>
                <dd className="text-base text-white text-right shrink-0">{valor}</dd>
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
