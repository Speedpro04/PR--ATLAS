import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FalhaApi } from '../nucleo/api'
import { sincronizarFrota } from '../nucleo/frota'
import { entrar, MARINA, type Sessao } from '../nucleo/sessao'

/**
 * Tela 1 — Login (PRD secao 6 e decisao 3.4).
 *
 * Matricula e senha, nao e-mail: o pessoal do chao nao tem e-mail corporativo,
 * mas todo mundo sabe a propria matricula. O endereco que o Supabase exige e
 * montado por baixo, em `sessao.ts`, e o colaborador nunca o ve.
 *
 * Entrar tambem BAIXA A FROTA. E o unico momento garantido com rede — depois
 * disso o app tem que funcionar no pier. Se o download falhar, a sessao vale
 * do mesmo jeito: barrar a entrada por causa da lista de barcos seria trocar
 * um problema pequeno por um total.
 */
export default function Login({
  aoEntrar,
  expirou = false,
}: {
  aoEntrar: (s: Sessao) => void
  /** Chegou aqui porque o token venceu, nao porque quis sair. */
  expirou?: boolean
}) {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function submeter(e: FormEvent) {
    e.preventDefault()
    if (entrando) return
    if (!matricula.trim() || !senha) {
      setErro('Preencha matrícula e senha.')
      return
    }

    setErro(null)
    setEntrando(true)
    try {
      const sessao = await entrar(matricula, senha)

      // Falha aqui nao derruba o login — ver o comentario do topo. A tela da
      // frota avisa quando esta vazia, e tenta de novo sozinha.
      try {
        await sincronizarFrota(sessao.token)
      } catch {
        /* entrou; a frota chega depois */
      }

      aoEntrar(sessao)
    } catch (e) {
      setErro(mensagemDe(e))
    } finally {
      setEntrando(false)
    }
  }

  return (
    // `deitado` = tela larga e baixa (tablet na horizontal, notebook curto). Ali
    // o empilhado nao cabe — sao 52px a mais que a altura util — e a saida e a
    // mesma do Login do Atlas: marca de um lado, formulario do outro.
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8 md:py-12 topo-seguro deitado:flex-row deitado:gap-16 deitado:px-12">
      <div className="w-full max-w-sm md:max-w-md deitado:flex-1 deitado:flex deitado:justify-center deitado:max-w-none">
        {/* Os vaos encolhem no celular e voltam no tablet. Com os espacos de
            tela grande, a composicao inteira sobe e sobra vazio embaixo do
            rodape — parece que a tela terminou antes da hora. */}
        <header className="text-center mb-10 md:mb-14 deitado:mb-0">
          <img
            src="/logo-transparent.png"
            alt=""
            // 223px e o tamanho pedido, mas ele so vale onde ha altura para
            // ele: em tela baixa a logo cede antes do formulario, porque
            // ninguem entra no app pela logo.
            className="w-[min(223px,26vh)] h-[min(223px,26vh)] mx-auto mb-5 md:mb-8 object-contain"
          />
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
            Atlas Pré-Data
          </h1>
          <p className="mt-3 md:mt-4 text-[10px] uppercase tracking-[0.4em] text-[#c5a059] font-black">
            {MARINA}
          </p>
        </header>
      </div>

      <div className="w-full max-w-sm md:max-w-md deitado:flex-1 deitado:max-w-md">
        <form onSubmit={submeter} className="space-y-6 md:space-y-8 deitado:space-y-6">
          <div className="group">
            {/* PROVISORIO ate a E2-a.
                O cadastro de colaborador (nome, matricula, telefone) e trabalho
                do repo do Atlas e ainda nao existe, entao NAO HA matricula no
                banco para ninguem digitar. Ate la o campo aceita os dois, e o
                rotulo precisa dizer isso: campo que recusa o que o rotulo
                promete faz quem esta entrando duvidar da propria senha.
                Quando o cadastro existir, volta a ser so "Matricula" e a dica
                abaixo sai. */}
            <label htmlFor="matricula" className="rotulo mb-3">
              Matrícula ou e-mail
            </label>
            <input
              id="matricula"
              className="campo"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              disabled={entrando}
              placeholder="seu@email.com"
              // `inputMode` e nao `type=number`: a matricula pode ganhar letra
              // um dia, e teclado numerico e o que importa para o dedo.
              // Enquanto a E2-a nao existe, o campo tambem aceita e-mail.
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div className="group">
            <label htmlFor="senha" className="rotulo mb-3">
              Senha
            </label>
            {/* Ver a senha nao e conforto, e a diferenca entre errar e
                desistir: com a mao suja, em pe e no sol, digitar errado e a
                regra — e sem poder conferir, o colaborador culpa a propria
                memoria e para de tentar. */}
            <div className="relative">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                className="campo pr-16"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={entrando}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                disabled={entrando}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
                // Encostado na borda direita e com a altura toda do campo: o
                // alvo tem 56px de lado, bem acima dos 44 do dedo.
                className="absolute right-0 top-0 h-full w-14 flex items-center justify-center text-white/25 hover:text-[#c5a059] focus-visible:text-[#c5a059] transition-colors disabled:opacity-30"
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {expirou && !erro && (
            <p className="text-[#e5d5b7] text-sm leading-relaxed">
              Sua sessão expirou. Entre de novo — o que você registrou continua
              guardado no aparelho.
            </p>
          )}

          {erro && (
            <p role="alert" className="text-sm text-[#e5d5b7] leading-relaxed">
              {erro}
            </p>
          )}

          <button type="submit" className="btn-primario" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/20 font-black leading-relaxed">
            Você entra uma vez.
            <br />O app fica aberto por 7 dias.
          </p>
        </form>
      </div>
    </div>
  )
}

/**
 * Cada falha merece uma frase diferente.
 *
 * "Erro ao entrar" faz o colaborador tentar a mesma senha cinco vezes quando o
 * problema era o sinal — e faz ele culpar a propria memoria quando a Marina e
 * que esta em atraso.
 */
function mensagemDe(e: unknown): string {
  if (!(e instanceof FalhaApi)) return 'Não foi possível entrar. Tente de novo.'
  switch (e.tipo) {
    case 'credenciais':
      return 'Matrícula ou senha incorreta.'
    case 'rede':
      return 'Sem conexão com o Atlas. Chegue perto do wi-fi e tente de novo.'
    case 'pagamento':
      return 'O acesso desta Marina está suspenso. Fale com o escritório — não é problema do seu cadastro.'
    default:
      return e.message || 'Não foi possível entrar. Tente de novo.'
  }
}
