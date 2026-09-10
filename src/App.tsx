import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Login from './telas/Login'
import EscolherBarco from './telas/EscolherBarco'
import Fichario from './telas/Fichario'
import { sessaoAtual, type Sessao } from './nucleo/sessao'

/** Sem sessao valida, tudo cai no login. */
function Porteiro({ sessao, children }: { sessao: Sessao | null; children: JSX.Element }) {
  const local = useLocation()
  if (!sessao) return <Navigate to="/entrar" state={{ de: local.pathname }} replace />
  return children
}

export default function App() {
  const [sessao, setSessao] = useState<Sessao | null>(() => sessaoAtual())

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/entrar"
          element={
            sessao ? <Navigate to="/" replace /> : <Login aoEntrar={setSessao} />
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
