import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Camera, Check, ChevronRight, Cog, Droplets, FileCheck, FileText,
  LifeBuoy, Navigation, Paintbrush, Sailboat, Shield, Ship, Sofa, Trash2,
  AlertTriangle, Upload, Wrench, Zap, Image as ImageIcon,
} from 'lucide-react'
import { acharBarco, descreverBarco, rotularBarco, tamanhoEmPes, type Barco } from '../nucleo/frota'
import { identificadorCurto, type Sessao } from '../nucleo/sessao'
import {
  CATEGORIAS, CONDICOES, acharCategoria, apagarFoto, descartarRascunho, faltaNoRascunho,
  fotosDoRascunho, guardarFoto, lerRascunho, novoRascunho, rascunhosDoAtivo, salvarRascunho,
  type CategoriaChave, type Foto, type Rascunho,
} from '../nucleo/rascunho'
import { camposDaCategoria, campoVisivel, type CampoRecorte } from '../nucleo/recorte'
import { CHAVES_HORIMETRO, CHAVES_OBSERVACAO } from '../nucleo/rascunho'
import { enviarRascunho, type ResultadoEnvio } from '../nucleo/envio'

/**
 * O aparelho tem camera de verdade para o `capture` usar?
 *
 * `capture="environment"` so vale em celular e tablet. No desktop o navegador
 * IGNORA o atributo e abre o seletor de arquivos — entao "Tirar foto agora" e
 * "Escolher do aparelho" fazem exatamente a mesma coisa, e a tela passa a
 * mentir sobre o que os botoes fazem.
 *
 * Ponteiro grosso mais toque e a leitura mais confiavel que existe sem pedir
 * permissao de camera: `enumerateDevices` exigiria autorizacao so para decidir
 * o rotulo de um botao.
 */
function aparelhoTemCamera(): boolean {
  if (typeof navigator === 'undefined' || typeof matchMedia === 'undefined') return false
  return navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches
}

const ICONES: Record<string, typeof Wrench> = {
  Wrench, Navigation, Cog, Shield, Zap, LifeBuoy, Droplets, Paintbrush, Sofa,
  Sailboat, AlertTriangle, FileCheck, FileText,
}

/**
 * Tela 3 — Registrar servico (PRD E3).
 *
 * TRES PASSOS, nesta ordem, e a ordem e a parte importante:
 *
 *   1. O QUE  — escolhe a categoria. Um toque, sem digitar.
 *   2. FOTO   — antes dos campos, nao depois. A peca sai do barco e some; o
 *               horimetro anda. A foto e a unica coisa aqui que nao se refaz no
 *               escritorio, entao ela vem primeiro, enquanto a mao ainda esta
 *               na peca. Formulario que pede foto no fim recebe foto no fim —
 *               quando a peca ja foi para o lixo.
 *   3. DADOS  — o que foi feito, horimetro, condicao, observacao.
 *
 * O rascunho vive no APARELHO. Nada daqui e selado, e a E4 e que sobe para o
 * `registros_rascunho` do Atlas. O escritorio completa o que mora na gaveta
 * (valor, nota fiscal, OS) e sela.
 */
export default function Fichario({ sessao }: { sessao: Sessao }) {
  const { id } = useParams()
  const navegar = useNavigate()

  const [barco, setBarco] = useState<Barco | null | undefined>(undefined)
  const [rascunho, setRascunho] = useState<Rascunho | null>(null)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [salvo, setSalvo] = useState(false)
  const [envio, setEnvio] = useState<ResultadoEnvio | null>(null)
  const [retomado, setRetomado] = useState(false)
  const [temCamera] = useState(aparelhoTemCamera)
  const [aviso, setAviso] = useState<string | null>(null)
  // Duas entradas, nao uma com botao duplo: `capture` e atributo do proprio
  // input, e alterna-lo por codigo nao e confiavel — parte dos Android le o
  // atributo uma vez so, quando o elemento nasce.
  const entradaCamera = useRef<HTMLInputElement>(null)
  const entradaGaleria = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let vivo = true
    if (!id) return setBarco(null)
    acharBarco(decodeURIComponent(id)).then((b) => vivo && setBarco(b))
    return () => {
      vivo = false
    }
  }, [id])

  /**
   * Retoma o registro que ficou aberto neste ativo.
   *
   * O rascunho e gravado a cada tecla, mas a TELA vivia so na memoria: bastava
   * o celular bloquear, o app ir para segundo plano ou a pagina recarregar para
   * o colaborador voltar na escolha de categoria, achando que perdeu tudo — com
   * o texto dele inteiro guardado no aparelho, invisivel.
   *
   * Retoma so o que ainda nao subiu: registro ja enviado ao painel esta
   * terminado, e reabri-lo faria o proximo servico nascer por cima do anterior.
   */
  useEffect(() => {
    let vivo = true
    if (!id) return
    const ativo = decodeURIComponent(id)
    rascunhosDoAtivo(ativo).then(async (lista) => {
      const aberto = lista.find((r) => !r.enviadoEm)
      if (!vivo || !aberto) return
      setRascunho(aberto)
      setFotos(await fotosDoRascunho(aberto.id))
      setRetomado(true)
    })
    return () => {
      vivo = false
    }
  }, [id])

  const abertura = useMemo(() => new Date(), [])

  async function escolherCategoria(chave: CategoriaChave) {
    if (!barco) return
    const r = novoRascunho(barco.id, chave, sessao.matricula, sessao.usuarioId, sessao.nome)
    setRascunho(r)
    await salvarRascunho(r)
  }

  async function mudar(campos: Partial<Rascunho>) {
    if (!rascunho) return
    const novo = { ...rascunho, ...campos }
    setRascunho(novo)
    setSalvo(false)
    await salvarRascunho(novo)
  }

  async function receberFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    e.target.value = '' // permite fotografar a mesma coisa de novo
    if (!rascunho || !arquivos.length) return

    for (const a of arquivos) {
      const f = await guardarFoto(rascunho.id, a, a.name || 'foto.jpg')
      if (!f) {
        setAviso('Não coube no aparelho. Apague alguma foto e tente de novo.')
        break
      }
    }
    const lista = await fotosDoRascunho(rascunho.id)
    setFotos(lista)
    setRascunho((r) => (r ? { ...r, fotos: lista.length } : r))
  }

  async function removerFoto(f: Foto) {
    await apagarFoto(f)
    const lista = await fotosDoRascunho(f.rascunhoId)
    setFotos(lista)
    setRascunho((r) => (r ? { ...r, fotos: lista.length } : r))
  }

  async function mudarEspecifico(key: string, valor: string) {
    if (!rascunho) return
    await mudar({ especificos: { ...(rascunho.especificos || {}), [key]: valor } })
  }

  /**
   * Guarda e manda para o painel, num toque so.
   *
   * Dois botoes — "salvar" e "enviar" — fariam o colaborador escolher entre
   * duas coisas que, para ele, sao a mesma: terminar. O pre-dado fica no
   * aparelho de qualquer jeito; o envio e so a travessia.
   */
  async function enviar() {
    if (!rascunho) return
    await salvarRascunho(rascunho)
    setSalvo(true)
    await enviarRascunho(rascunho, sessao.token, setEnvio)
    // Recarrega SEMPRE, nao so no sucesso: uma tentativa que caiu no meio ja
    // pode ter criado o rascunho no Atlas, e a tela passa a carregar o id de la.
    const atualizado = await lerRascunho(rascunho.id)
    if (atualizado) setRascunho(atualizado)
  }

  if (barco === undefined) return <div className="min-h-[100dvh]" aria-busy="true" />

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

  const categoria = rascunho ? acharCategoria(rascunho.categoria) : undefined
  const falta = rascunho ? faltaNoRascunho(rascunho) : []
  const proprios = rascunho ? camposDaCategoria(rascunho.categoria) : []
  // A categoria trouxe o seu proprio horimetro/observacao? Entao o generico
  // sai: dois campos pedindo a mesma coisa fazem quem preenche escolher um e
  // deixar o outro vazio — e o escritorio recebe metade da leitura.
  const temHorimetroProprio = proprios.some((c) => CHAVES_HORIMETRO.includes(c.key))
  const temObsPropria = proprios.some((c) => CHAVES_OBSERVACAO.includes(c.key))

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 pb-40 topo-seguro">
      <header className="pb-6 border-b border-white/5">
        <button
          onClick={async () => {
            if (!rascunho) return navegar('/')
            // Sem nada preenchido, trocar de servico apaga o rascunho vazio em
            // vez de deixar lixo que seria "retomado" na proxima visita.
            if (!rascunho.servico.trim() && !rascunho.fotos) {
              await descartarRascunho(rascunho.id)
            }
            setRascunho(null)
            setFotos([])
            setRetomado(false)
          }}
          className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-white/30 font-black py-3 hover:text-white/60 transition-colors"
        >
          <ArrowLeft size={14} />
          {rascunho ? 'Trocar serviço' : 'Trocar ativo'}
        </button>
        <div className="flex items-center gap-3 mt-4 mb-2">
          <Ship size={20} className="text-[#c5a059] shrink-0" />
          <h1 className="text-2xl md:text-4xl font-serif font-bold text-white">
            {rotularBarco(barco)}
          </h1>
        </div>
        <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em] font-black ml-12 leading-relaxed">
          {descreverBarco(barco)}
          {tamanhoEmPes(barco) && ` · ${tamanhoEmPes(barco)}`}
        </p>
      </header>

      {!rascunho ? (
        /* ───────── passo 1: o que foi feito ───────── */
        <main className="py-8">
          <h2 className="rotulo mb-1">O que você fez?</h2>
          <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] font-black mb-6">
            Um toque. O resto vem depois.
          </p>

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {CATEGORIAS.map((c) => {
              const Icone = ICONES[c.icone] ?? Wrench
              return (
                <li key={c.chave}>
                  <button
                    onClick={() => escolherCategoria(c.chave)}
                    className="w-full text-left bg-white/[0.02] border border-white/5 p-5 rounded-sm transition-colors hover:border-[#c5a059]/40 flex items-center gap-4"
                    style={{ minHeight: 'var(--toque-min)' }}
                  >
                    <Icone size={22} className="text-[#c5a059] shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-white leading-tight">
                        {c.rotulo}
                      </span>
                      <span className="block text-[9px] text-white/35 uppercase tracking-widest mt-1">
                        {c.ajuda}
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-white/20 shrink-0" />
                  </button>
                </li>
              )
            })}
          </ul>
        </main>
      ) : (
        /* ───────── passos 2 e 3: foto e dados ───────── */
        <main className="py-8 space-y-8 md:grid md:grid-cols-2 md:gap-8 md:space-y-0 md:items-start">
          {retomado && envio?.estado !== 'enviado' && (
            <div className="md:col-span-2 border border-[#c5a059]/25 bg-[#c5a059]/[0.04] rounded-sm px-5 py-4 flex flex-wrap items-center gap-4">
              <p className="text-white/70 text-sm flex-1 min-w-[200px]">
                Retomei o registro que você tinha começado aqui.
              </p>
              <button
                onClick={async () => {
                  await descartarRascunho(rascunho.id)
                  setRascunho(null)
                  setFotos([])
                  setRetomado(false)
                }}
                className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 hover:text-white/80 px-4 py-3"
              >
                Descartar e começar outro
              </button>
            </div>
          )}
          {/* FOTO PRIMEIRO. Ver o comentario do topo: e a unica coisa desta
              tela que nao se refaz no escritorio. */}
          <section className="bg-white/[0.02] border border-white/5 p-6 rounded-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="rotulo">Fotografe agora</h2>
              <span className="text-[10px] font-black text-[#c5a059] tracking-widest">
                {fotos.length || '—'}
              </span>
            </div>
            <p className="text-white/25 text-[10px] uppercase tracking-[0.2em] font-black mb-5 leading-relaxed">
              A peça vai para o lixo. A foto não se refaz.
            </p>

            {/* `capture` abre a camera traseira direto no celular. Mas em
                parte dos Android ele TRAVA na camera e some com a galeria —
                quem ja fotografou a peca antes de abrir o app ficaria sem
                anexar. Dai as duas portas, e a camera em primeiro por ser o
                caminho do pier. */}
            <input
              ref={entradaCamera}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={receberFotos}
            />
            <input
              ref={entradaGaleria}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={receberFotos}
            />

            {/* No celular, a camera e o caminho do pier e vem primeiro. No
                desktop ela nao existe: mostrar os dois botoes ali faria dois
                caminhos identicos com nomes diferentes. */}
            <button
              onClick={() =>
                (temCamera ? entradaCamera : entradaGaleria).current?.click()
              }
              className="w-full flex items-center justify-center gap-3 rounded-sm border border-dashed border-[#c5a059]/40 text-[#c5a059] py-8 text-[10px] font-black uppercase tracking-[0.3em] transition-colors hover:bg-[#c5a059]/5"
            >
              {temCamera ? <Camera size={20} /> : <ImageIcon size={20} />}
              {temCamera
                ? fotos.length
                  ? 'Tirar outra foto'
                  : 'Tirar foto agora'
                : fotos.length
                  ? 'Mais uma imagem'
                  : 'Escolher imagem'}
            </button>

            {temCamera && (
              <button
                onClick={() => entradaGaleria.current?.click()}
                className="w-full flex items-center justify-center gap-3 mt-3 rounded-sm border border-white/10 text-white/40 py-4 text-[10px] font-black uppercase tracking-[0.25em] transition-colors hover:text-white/70 hover:border-white/25"
                style={{ minHeight: 'var(--toque-min)' }}
              >
                <ImageIcon size={16} />
                Já tenho a foto
              </button>
            )}

            {!temCamera && (
              // Diz por que o botao de camera nao esta aqui, em vez de deixar
              // quem testa no computador achar que a funcao nao foi feita.
              <p className="text-white/20 text-[9px] uppercase tracking-widest mt-3 text-center leading-relaxed">
                No celular, este botão abre a câmera direto
              </p>
            )}

            {fotos.length > 0 && (
              <ul className="grid grid-cols-3 gap-3 mt-5">
                {fotos.map((f) => (
                  <li key={f.id} className="relative">
                    <Miniatura foto={f} />
                    <button
                      onClick={() => removerFoto(f)}
                      aria-label="Apagar foto"
                      className="absolute top-1 right-1 w-9 h-9 flex items-center justify-center rounded-sm bg-[#010c20]/85 text-white/60 hover:text-white transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white/[0.02] border border-white/5 p-6 rounded-sm space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-5">
                {(() => {
                  const I = ICONES[categoria?.icone ?? 'Wrench'] ?? Wrench
                  return <I size={20} className="text-[#c5a059]" />
                })()}
                <h2 className="text-lg font-bold text-white">{categoria?.rotulo}</h2>
              </div>

              <label htmlFor="servico" className="rotulo mb-3">
                O que foi feito
              </label>
              <input
                id="servico"
                className="campo"
                value={rascunho.servico}
                onChange={(e) => mudar({ servico: e.target.value })}
                placeholder="Ex: troquei o óleo do motor de bombordo"
                autoCapitalize="sentences"
              />
            </div>

            <div>
              <label htmlFor="executou" className="rotulo mb-3">
                Quem executou
              </label>
              <input
                id="executou"
                className="campo"
                value={rascunho.executadoPor}
                onChange={(e) => mudar({ executadoPor: e.target.value })}
                placeholder={rascunho.registradoPor || 'Você mesmo'}
                autoCapitalize="words"
              />
              {/* O padrao e "fui eu": deixar vazio ja responde a pergunta. O
                  campo existe porque na marina o mecanico faz e as vezes outra
                  pessoa lanca — e para o escritorio nao e a mesma coisa. */}
              <p className="text-white/25 text-[9px] uppercase tracking-widest mt-2 leading-relaxed">
                Deixe vazio se foi você · registrado por{' '}
                {rascunho.registradoPor || sessao.matricula}
              </p>
            </div>

            {/* Campos proprios da categoria. So aparecem nas que passaram pelo
                verificador adversarial — ver nucleo/recorte.ts. Nas demais a
                lista vem vazia e sobra o formulario curto, que serve para
                qualquer servico. */}
            {proprios.map((campo) =>
              campoVisivel(campo, rascunho.especificos || {}) ? (
                <CampoProprio
                  key={campo.key}
                  campo={campo}
                  valor={(rascunho.especificos || {})[campo.key] ?? ''}
                  aoMudar={(v) => mudarEspecifico(campo.key, v)}
                />
              ) : null,
            )}

            {!temHorimetroProprio && (
              <div>
                <label htmlFor="horimetro" className="rotulo mb-3">
                  Horímetro
                </label>
                <input
                  id="horimetro"
                  className="campo"
                  value={rascunho.horimetro}
                  onChange={(e) => mudar({ horimetro: e.target.value })}
                  placeholder="Leitura de agora"
                  // decimal e nao numeric: horimetro tem virgula, e o teclado
                  // numerico puro esconde a tecla dela em boa parte dos Android.
                  inputMode="decimal"
                />
              </div>
            )}

            <div>
              <span className="rotulo mb-3 block">Como ficou</span>
              <div className="grid grid-cols-3 gap-2">
                {CONDICOES.map((c) => {
                  const ativa = rascunho.condicao === c.valor
                  return (
                    <button
                      key={c.valor}
                      onClick={() => mudar({ condicao: c.valor })}
                      aria-pressed={ativa}
                      className={`rounded-sm border px-2 py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
                        ativa
                          ? 'bg-[#c5a059] text-[#010c20] border-[#c5a059]'
                          : 'border-white/10 text-white/40 hover:border-white/25'
                      }`}
                      style={{ minHeight: 'var(--toque-min)' }}
                    >
                      {c.rotulo}
                    </button>
                  )
                })}
              </div>
              <p className="text-white/25 text-[9px] uppercase tracking-widest mt-3">
                {CONDICOES.find((c) => c.valor === rascunho.condicao)?.ajuda}
              </p>
            </div>

            {!temObsPropria && (
              <div>
                <label htmlFor="obs" className="rotulo mb-3">
                  Observação
                </label>
                <textarea
                  id="obs"
                  rows={4}
                  className="campo resize-none"
                  value={rascunho.observacao}
                  onChange={(e) => mudar({ observacao: e.target.value })}
                  placeholder="O que o escritório precisa saber e não está na foto"
                />
              </div>
            )}

            {/* O que o app ja sabe, pequeno: e conferencia, nao trabalho. */}
            <p className="text-[9px] text-white/30 uppercase tracking-widest leading-relaxed border-t border-white/5 pt-5">
              {sessao.nome || identificadorCurto(sessao.matricula)}
              {sessao.marina ? ` · ${sessao.marina}` : ''}
              <br />
              {abertura.toLocaleDateString('pt-BR')} às{' '}
              {abertura.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </section>
        </main>
      )}

      {rascunho && (
        <div className="rodape-acao">
          <div className="mx-auto max-w-2xl lg:max-w-md">
            {aviso && (
              <p role="alert" className="text-[#e5d5b7] text-xs mb-3 text-center">
                {aviso}
              </p>
            )}
            {/* O que falta aparece ANTES do toque, nao como erro depois dele:
                botao que so diz "nao" quando ja foi apertado ensina a nao
                apertar. */}
            {falta.length > 0 && (
              <p className="text-white/30 text-[9px] uppercase tracking-widest text-center mb-3">
                Falta {falta.join(' · ')}
              </p>
            )}
            <button
              onClick={enviar}
              disabled={falta.length > 0 || envio?.estado === 'enviando' || envio?.estado === 'enviado'}
              className="btn-primario flex items-center justify-center gap-3"
            >
              {envio?.estado === 'enviado' ? <Check size={16} /> : <Upload size={16} />}
              {rotuloEnvio(envio)}
            </button>
            <p className="text-center text-[9px] uppercase tracking-widest text-white/20 font-black mt-3 leading-relaxed">
              {envio?.estado === 'enviado'
                ? 'O escritório já vê. Continua guardado aqui.'
                : envio?.erro
                  ? envio.erro
                  : salvo
                    ? 'Guardado no aparelho'
                    : 'Vai para o painel como pré-dado, não selado'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Miniatura da foto.
 *
 * `createObjectURL` reserva memoria que so sai com `revokeObjectURL` — sem o
 * cleanup, cada foto vista fica presa ate a aba fechar, e num celular de
 * entrada com vinte fotos isso derruba o app.
 */
function Miniatura({ foto }: { foto: Foto }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const u = URL.createObjectURL(foto.arquivo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [foto])

  return (
    <div className="aspect-square rounded-sm overflow-hidden bg-white/[0.03] border border-white/5">
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
    </div>
  )
}

/**
 * Um campo proprio da categoria.
 *
 * `select` vira BOTAO, nao lista suspensa: "Houve troca de oleo? Sim/Nao" com
 * dois alvos de dedo resolve num toque, enquanto um <select> no celular abre
 * uma roleta que exige mirar, rolar e confirmar — tres gestos com a mao suja
 * para responder sim.
 */
function CampoProprio({
  campo,
  valor,
  aoMudar,
}: {
  campo: CampoRecorte
  valor: string
  aoMudar: (v: string) => void
}) {
  const opcoes = campo.options ?? []
  const curtas = opcoes.length > 0 && opcoes.every((o) => o.length <= 14)

  if (opcoes.length && curtas) {
    return (
      <div>
        <span className="rotulo mb-3 block">{campo.label}</span>
        <div className="flex flex-wrap gap-2">
          {opcoes.map((o) => {
            const ativa = valor === o
            return (
              <button
                key={o}
                onClick={() => aoMudar(ativa ? '' : o)}
                aria-pressed={ativa}
                className={`rounded-sm border px-5 text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${
                  ativa
                    ? 'bg-[#c5a059] text-[#010c20] border-[#c5a059]'
                    : 'border-white/10 text-white/40 hover:border-white/25'
                }`}
                style={{ minHeight: 'var(--toque-min)' }}
              >
                {o}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Opcao longa demais para caber num botao volta a ser lista.
  if (opcoes.length) {
    return (
      <div className="group">
        <label htmlFor={campo.key} className="rotulo mb-3">
          {campo.label}
        </label>
        <select
          id={campo.key}
          className="campo"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        >
          <option value="">—</option>
          {opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="group">
      <label htmlFor={campo.key} className="rotulo mb-3">
        {campo.label}
        {campo.suffix ? ` (${campo.suffix})` : ''}
      </label>
      {campo.type === 'textarea' ? (
        <textarea
          id={campo.key}
          rows={4}
          className="campo resize-none"
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={campo.placeholder ?? undefined}
        />
      ) : (
      <input
        id={campo.key}
        className="campo"
        type={campo.type === 'date' ? 'date' : campo.type === 'time' ? 'time' : 'text'}
        inputMode={campo.type === 'number' ? 'decimal' : undefined}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={campo.placeholder ?? undefined}
      />
      )}
    </div>
  )
}

/** O botao conta o que esta acontecendo, inclusive quantas fotos ja subiram. */
function rotuloEnvio(e: ResultadoEnvio | null): string {
  if (!e) return 'Enviar para o painel'
  if (e.estado === 'enviando') {
    return e.fotosTotal
      ? `Enviando… ${e.fotosEnviadas}/${e.fotosTotal} fotos`
      : 'Enviando…'
  }
  if (e.estado === 'enviado') return 'Enviado ao painel'
  if (e.estado === 'falhou') return 'Tentar enviar de novo'
  return 'Enviar para o painel'
}
