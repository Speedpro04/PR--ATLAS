import { useState, type FormEvent } from 'react'
import { FalhaApi } from '../nucleo/api'
import { sincronizarFrota } from '../nucleo/frota'
import { entrarComCodigo, MARINA, type Sessao } from '../nucleo/sessao'

/**
 * Tela 1 — Login.
 *
 * SÓ CÓDIGO DO APARELHO. Não há entrada por conta neste app, de propósito: a
 * senha da Marina abre o painel inteiro — selar registro, emitir dossiê,
 * liberar documento, ver a frota — e oferecer esse caminho aqui faria alguém
 * pedir a senha mais cedo ou mais tarde. Quem precisa entrar, inclusive a
 * gerente, gera um código para o próprio aparelho.
 *
 * Some com isso o problema que a versão anterior arrastava: matrícula que não
 * existe no banco, e-mail montado por baixo, senha que o colaborador não
 * deveria ter.
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
  /** Chegou aqui porque a sessão venceu, não porque quis sair. */
  expirou?: boolean
}) {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)
  // SÓ CÓDIGO. Não há entrada por conta neste app, de propósito.
  //
  // A senha da Marina abre o painel inteiro — selar registro, emitir dossiê,
  // liberar documento, ver a frota. Oferecer esse caminho aqui faria alguém
  // pedir a senha mais cedo ou mais tarde, e o risco voltaria pela porta que
  // nós mesmos deixamos aberta. Quem precisa entrar — inclusive a gerente —
  // gera um código para o próprio aparelho.

  async function submeter(e: FormEvent) {
    e.preventDefault()
    if (entrando) return

    if (!codigo.trim()) {
      setErro('Digite o código do aparelho.')
      return
    }

    setErro(null)
    setEntrando(true)
    try {
      const sessao = await entrarComCodigo(codigo)

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
          {/* O CÓDIGO DO APARELHO é o caminho padrão. Um campo só, sem senha
              para decorar e sem conta para carregar no bolso — e, do outro
              lado, um acesso que não abre o painel da Marina. */}
              <div className="group">
                <label htmlFor="codigo" className="rotulo mb-3">
                  Código do aparelho
                </label>
                <input
                  id="codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="ABCD-2345"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="campo text-center tracking-[0.3em] text-xl"
                />
                <p className="dica mt-3">
                  A Marina gera este código no painel e entrega a você. Com ele dá
                  para registrar serviço e foto — nada além disso.
                </p>
                {/* Sem esta linha, quem foi derrubado pelo vencimento acha que
                    errou o código — e digita o mesmo cinco vezes. */}
                {expirou && (
                  <p className="dica mt-2 text-[#e5d5b7]">
                    Sua sessão venceu. Digite o mesmo código para continuar.
                  </p>
                )}
              </div>

              <button type="submit" className="btn-primario" disabled={entrando}>
                {entrando ? 'Entrando…' : 'Entrar'}
              </button>

              {erro && <p className="erro">{erro}</p>}

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
