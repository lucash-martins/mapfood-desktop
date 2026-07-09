import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import StatusBar from './StatusBar'

export default function Layout() {
  const navigate = useNavigate()
  const [nome, setNome] = useState('Administrador')

  useEffect(() => {
    window.electronAPI?.auth.getNome().then(n => { if (n) setNome(n) })
    const unsubscribe = window.electronAPI?.auth.onSessaoExpirada?.(() => {
      navigate('/login')
    })
    return () => unsubscribe?.()
  }, [navigate])

  async function logout() {
    await window.electronAPI?.auth.limparToken()
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">🍔</span>
          <span className="sidebar-title">MapFood Admin</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard">📊 Dashboard</NavLink>
          <NavLink to="/denuncias">🚨 Denúncias</NavLink>
          <NavLink to="/avaliacoes">⭐ Avaliações</NavLink>
          <NavLink to="/lojas">🏪 Lojas</NavLink>
          <NavLink to="/usuarios">👥 Usuários</NavLink>
          <NavLink to="/relatorios">📈 Relatórios</NavLink>
        </nav>
        <StatusBar />
        <div className="sidebar-footer">
          <span className="sidebar-user">{nome}</span>
          <button className="logout-btn" onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}