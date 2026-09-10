import { useState, type FormEvent } from 'react'
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
export default function Login({ aoEntrar }: { aoEntrar: (s: Sessao) => void }) {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

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
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12 topo-seguro deitado:flex-row deitado:gap-16 deitado:px-12">
      <div className="w-full max-w-sm md:max-w-md deitado:flex-1 deitado:flex deitado:justify-center deitado:max-w-none">
        <header className="text-center mb-14 deitado:mb-0">
          <img
            src="/logo-transparent.png"
            alt=""
            // 223px e o tamanho pedido, mas ele so vale onde ha altura para
            // ele: em tela baixa a logo cede antes do formulario, porque
            // ninguem entra no app pela logo.
            className="w-[min(223px,26vh)] h-[min(223px,26vh)] mx-auto mb-8 object-contain"
          />
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
            Atlas Service
          </h1>
          <p className="mt-4 text-[10px] uppercase tracking-[0.4em] text-[#c5a059] font-black">
            {MARINA}
          </p>
        </header>
      </div>

      <div className="w-full max-w-sm md:max-w-md deitado:flex-1 deitado:max-w-md">
        <form onSubmit={submeter} className="space-y-8 deitado:space-y-6">
          <div className="group">
            <label htmlFor="matricula" className="rotulo mb-3">
              Matrícula
            </label>
            <input
              id="matricula"
              className="campo"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              disabled={entrando}
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
            <input
              id="senha"
              type="password"
              className="campo"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={entrando}
              autoComplete="current-password"
            />
          </div>

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
