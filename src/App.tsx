import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Login from './telas/Login'
import EscolherBarco from './telas/EscolherBarco'
import Fichario from './telas/Fichario'
import { sessaoAtual, sessaoCaiu, type Sessao } from './nucleo/sessao'
import { aoCairSessao } from './nucleo/api'
import { migrarBancosAntigos } from './nucleo/db'

/** Sem sessao valida, tudo cai no login. */
function Porteiro({ sessao, children }: { sessao: Sessao | null; children: JSX.Element }) {
  const local = useLocation()
  if (!sessao) return <Navigate to="/entrar" state={{ de: local.pathname }} replace />
  return children
}

export default function App() {
  const [sessao, setSessao] = useState<Sessao | null>(() => sessaoAtual())
  const [expirou, setExpirou] = useState(false)

  /**
   * Token vencido derruba para o login — em UM lugar so.
   *
   * Sem isto o app ficava de pe com uma sessao morta: toda chamada voltava 401,
   * a frota aparecia vazia e o colaborador via "nenhum ativo no aparelho" sem
   * nenhuma pista de que o problema era a sessao. Tela vazia que nao explica
   * nada e o jeito mais rapido de fazer alguem achar que o app quebrou.
   *
   * Enquanto o Atlas nao tiver rota de refresh (E2-a), vencer e voltar ao login
   * e o comportamento possivel — mas ele precisa ser DITO.
   */
  useEffect(() => {
    aoCairSessao(() => {
      sessaoCaiu()
      setSessao(null)
      setExpirou(true)
    })
  }, [])

  // Renome do produto trocou o nome do IndexedDB; traz o que ficou para tras.
  useEffect(() => {
    migrarBancosAntigos()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/entrar"
          element={
            sessao ? (
              <Navigate to="/" replace />
            ) : (
              <Login
                aoEntrar={(s) => {
                  setExpirou(false)
                  setSessao(s)
                }}
                expirou={expirou}
              />
            )
          }
        />
        <Route
          path="/"
          element={
            <Porteiro sessao={sessao}>
              <EscolherBarco sessao={sessao!} aoSair={() => setSessao(null)} />
            </Porteiro>
          }
        />
        <Route
          path="/barco/:id"
          element={
            <Porteiro sessao={sessao}>
              <Fichario sessao={sessao!} />
            </Porteiro>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
