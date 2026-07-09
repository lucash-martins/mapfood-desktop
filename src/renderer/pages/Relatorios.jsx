import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts'
import { getRelatorioStats } from '../services/api'

const CHART_COLORS = ['#e63946', '#f59e0b', '#eab308', '#10b981', '#3b82f6', '#8b5cf6']

const STATUS_LOJA_LABEL = { ATIVA: 'Ativa', INATIVA: 'Inativa', SUSPENSA: 'Suspensa' }
const STATUS_DENUNCIA_LABEL = { PENDENTE: 'Pendente', EM_ANALISE: 'Em análise', RESOLVIDA: 'Resolvida', ARQUIVADA: 'Arquivada' }

const COLUNAS_LOJA = [
  { key: 'nome', label: 'Loja' },
  { key: 'comerciante_nome', label: 'Comerciante' },
  { key: 'status_loja', label: 'Status' },
  { key: 'total_avaliacoes', label: 'Avaliações' },
  { key: 'media_nota', label: 'Nota Média' },
  { key: 'total_denuncias', label: 'Denúncias' },
  { key: 'denuncias_pendentes', label: 'Denúncias Pend.' },
]

function normalizarBusca(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

function formatMes(mes) {
  if (!mes) return '—'
  const [ano, m] = mes.split('-')
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const idx = parseInt(m, 10) - 1
  return `${nomes[idx] ?? m}/${ano.slice(2)}`
}

function exportCSV(rows, headers, filename) {
  const escape = (val) => {
    const s = String(val ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const linhas = [
    headers.map(h => escape(h.label)).join(';'),
    ...rows.map(row => headers.map(h => escape(row[h.key])).join(';')),
  ]
  const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function Relatorios() {
  const [stats, setStats] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')
  const [sortBy, setSortBy] = useState('total_avaliacoes')
  const [sortDir, setSortDir] = useState('desc')

  async function carregar() {
    try {
      const s = await getRelatorioStats()
      setStats(s || {})
      setErro(null)
    } catch (e) {
      setErro('Erro ao carregar dados dos relatórios.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()

    const unsubscribe = window.electronAPI?.sync.onSyncStatus((status) => {
      if (status.estado === 'idle') carregar()
    })

    return () => unsubscribe?.()
  }, [])

  function handleOrdenar(coluna) {
    if (sortBy === coluna) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(coluna)
      setSortDir('desc')
    }
  }

  const lojasDetalhe = useMemo(() => {
    const termo = normalizarBusca(busca)
    const lista = (stats?.lojasDetalhe ?? []).filter(l =>
      !termo || normalizarBusca(l.nome).includes(termo)
    )
    const dir = sortDir === 'asc' ? 1 : -1
    return [...lista].sort((a, b) => {
      const va = a[sortBy] ?? 0
      const vb = b[sortBy] ?? 0
      if (typeof va === 'string') return va.localeCompare(vb) * dir
      return (va - vb) * dir
    })
  }, [stats, busca, sortBy, sortDir])

  if (carregando) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Relatórios</h1></div>
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Relatórios</h1></div>
        <div className="error-msg">{erro}</div>
      </div>
    )
  }

  const kpis = [
    { key: 'totalLojas', label: 'Total de Lojas', valor: stats.totalLojas ?? 0 },
    { key: 'totalConsumidores', label: 'Consumidores', valor: stats.totalConsumidores ?? 0 },
    { key: 'totalComerciantes', label: 'Comerciantes', valor: stats.totalComerciantes ?? 0 },
    { key: 'totalAvaliacoes', label: 'Total de Avaliações', valor: stats.totalAvaliacoes ?? 0 },
    { key: 'notaMedia', label: 'Nota Média', valor: (stats.notaMedia ?? 0).toFixed(2) },
    { key: 'totalDenuncias', label: 'Total de Denúncias', valor: stats.totalDenuncias ?? 0 },
    { key: 'denunciasPendentes', label: 'Denúncias Pendentes', valor: stats.denunciasPendentes ?? 0 },
  ]

  const avaliacoesPorMes = (stats.avaliacoesPorMes ?? []).map(r => ({
    mes: formatMes(r.mes),
    media: r.media ? Number(r.media.toFixed(2)) : 0,
    total: r.total,
  }))

  const distribuicaoNotas = [1, 2, 3, 4, 5].map(nota => {
    const found = (stats.distribuicaoNotas ?? []).find(r => r.nota === nota)
    return { nota: `${nota} ★`, total: found?.total ?? 0 }
  })

  const lojasPorStatus = (stats.lojasPorStatus ?? []).map(r => ({
    status: STATUS_LOJA_LABEL[r.status] ?? r.status,
    total: r.total,
  }))

  const denunciasPorStatus = (stats.denunciasPorStatus ?? []).map(r => ({
    status: STATUS_DENUNCIA_LABEL[r.status] ?? r.status,
    total: r.total,
  }))

  function handleExportarResumo() {
    exportCSV(
      kpis.map(k => ({ indicador: k.label, valor: k.valor })),
      [{ key: 'indicador', label: 'Indicador' }, { key: 'valor', label: 'Valor' }],
      `mapfood-resumo-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  function handleExportarLojas() {
    exportCSV(
      lojasDetalhe.map(l => ({
        ...l,
        status_loja: STATUS_LOJA_LABEL[l.status_loja] ?? l.status_loja,
        media_nota: l.media_nota ? l.media_nota.toFixed(2) : '',
      })),
      COLUNAS_LOJA,
      `mapfood-lojas-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Relatórios</h1>
        <button className="btn-secondary" style={{ width: 'auto' }} onClick={handleExportarResumo}>
          ⬇ Baixar Resumo (CSV)
        </button>
      </div>

      <div className="kpi-grid">
        {kpis.map(kpi => (
          <div className="kpi-card" key={kpi.key}>
            <p className="kpi-label">{kpi.label}</p>
            <p className="kpi-value">{kpi.valor}</p>
          </div>
        ))}
      </div>

      <div className="chart-card">
        <h2>Média de Avaliações por Mês</h2>
        {avaliacoesPorMes.length === 0 ? (
          <div className="chart-empty">Sem dados de avaliações.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={avaliacoesPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis domain={[0, 5]} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="media" name="Nota média" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="chart-grid">
        <div className="chart-card">
          <h2>Distribuição de Notas</h2>
          {distribuicaoNotas.every(d => d.total === 0) ? (
            <div className="chart-empty">Sem dados de avaliações.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribuicaoNotas}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="nota" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" name="Avaliações" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h2>Lojas por Status</h2>
          {lojasPorStatus.length === 0 ? (
            <div className="chart-empty">Sem lojas cadastradas.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={lojasPorStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                  {lojasPorStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h2>Denúncias por Status</h2>
        {denunciasPorStatus.length === 0 ? (
          <div className="chart-empty">Sem denúncias registradas.</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={denunciasPorStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                {denunciasPorStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <h2>Detalhamento por Loja</h2>
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={handleExportarLojas}>
            ⬇ Baixar CSV
          </button>
        </div>

        <div style={{ marginBottom: '1rem', maxWidth: 320 }}>
          <input
            type="text"
            placeholder="Buscar loja por nome..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {lojasDetalhe.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma loja encontrada.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {COLUNAS_LOJA.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleOrdenar(col.key)}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      {col.label}{sortBy === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lojasDetalhe.map(l => (
                  <tr key={l.id}>
                    <td>{l.nome || '—'}</td>
                    <td>{l.comerciante_nome || '—'}</td>
                    <td>{STATUS_LOJA_LABEL[l.status_loja] ?? l.status_loja ?? '—'}</td>
                    <td>{l.total_avaliacoes}</td>
                    <td>{l.media_nota ? l.media_nota.toFixed(2) : '—'}</td>
                    <td>{l.total_denuncias}</td>
                    <td>{l.denuncias_pendentes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
