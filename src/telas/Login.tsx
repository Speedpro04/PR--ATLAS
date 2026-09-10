import { useState, type FormEvent } from 'react'
import { abrirSessao, MARINA, type Sessao } from '../nucleo/sessao'

/**
 * Tela 1 — Login (PRD secao 6).
 *
 * Matricula e senha, nao e-mail: o pessoal do chao nao tem e-mail corporativo,
 * mas todo mundo sabe a propria matricula. O endereco que o Supabase exige e
 * montado por baixo, na E2, a partir da matricula.
 */
export default function Login({ aoEntrar }: { aoEntrar: (s: Sessao) => void }) {
  const [matricula, setMatricula] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function entrar(e: FormEvent) {
    e.preventDefault()
    if (!matricula.trim() || !senha) return setErro('Preencha matrícula e senha.')
    // E2 troca isto por autenticacao de verdade contra /api/v1.
    aoEntrar(abrirSessao(matricula, 'Colaborador'))
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12 topo-seguro">
      <div className="w-full max-w-sm md:max-w-md">
        <header className="text-center mb-14">
          <img
            src="/logo-transparent.png"
            alt=""
            className="w-[200px] h-[200px] mx-auto mb-8 object-contain"
          />
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
            Atlas Campo
          </h1>
          <p className="mt-4 text-[10px] uppercase tracking-[0.4em] text-[#c5a059] font-black">
            {MARINA}
          </p>
        </header>

        <form onSubmit={entrar} className="space-y-8">
          <div className="group">
            <label htmlFor="matricula" className="rotulo mb-3">
              Matrícula
            </label>
            <input
              id="matricula"
              className="campo"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              inputMode="numeric"
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </div>

          {erro && <p className="text-sm text-[#e5d5b7]">{erro}</p>}

          <button type="submit" className="btn-primario">
            Entrar
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
