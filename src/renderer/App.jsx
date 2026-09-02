import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import EsqueciSenha from './pages/EsqueciSenha'
import Dashboard from './pages/Dashboard'
import Denuncias from './pages/Denuncias'
import Avaliacoes from './pages/Avaliacoes'
import Lojas from './pages/Lojas'
import Usuarios from './pages/Usuarios'
import Relatorios from './pages/Relatorios'
import Blog from './pages/Blog'
import Layout from './components/Layout'

function PrivateRoute() {
  const [verificado, setVerificado] = useState(false)
  const [autenticado, setAutenticado] = useState(false)

  useEffect(() => {
    window.electronAPI?.auth.getToken().then(token => {
      setAutenticado(!!token)
      setVerificado(true)
    })
  }, [])

  if (!verificado) return null
  if (!autenticado) return <Navigate to="/login" replace />
  return <Layout />
}

function RootRedirect() {
  const [verificado, setVerificado] = useState(false)
  const [autenticado, setAutenticado] = useState(false)

  useEffect(() => {
    window.electronAPI?.auth.getToken().then(token => {
      setAutenticado(!!token)
      setVerificado(true)
    })
  }, [])

  if (!verificado) return null
  return <Navigate to={autenticado ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/" element={<RootRedirect />} />
      <Route element={<PrivateRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/denuncias" element={<Denuncias />} />
        <Route path="/avaliacoes" element={<Avaliacoes />} />
        <Route path="/lojas" element={<Lojas />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/blog" element={<Blog />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}