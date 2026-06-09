"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Search, X, Monitor, Smartphone, Tablet, Globe,
  Calendar, ChevronLeft, ChevronRight, RefreshCw,
  AlertCircle, Shield, Activity, Filter,
} from "lucide-react"

type Log = {
  id: string
  usuarioNome: string | null
  modulo: string
  acao: string
  descricao: string
  referencia: string | null
  ip: string | null
  userAgent: string | null
  dispositivo: string | null
  navegador: string | null
  createdAt: string
}

type Stats = {
  total: number
  modulos: Record<string, number>
  dispositivos: Record<string, number>
  usuarios: Record<string, number>
}

const MODULO_CORES: Record<string, string> = {
  LACRES:         "bg-blue-100 text-blue-700",
  VISTORIA:       "bg-green-100 text-green-700",
  BOXES:          "bg-purple-100 text-purple-700",
  RECEBIMENTO:    "bg-orange-100 text-orange-700",
  EXPEDICAO:      "bg-yellow-100 text-yellow-700",
  INVENTARIO:     "bg-pink-100 text-pink-700",
  MOVIMENTACAO:   "bg-cyan-100 text-cyan-700",
  QUALIDADE:      "bg-teal-100 text-teal-700",
  OCORRENCIAS:    "bg-red-100 text-red-700",
  PLANO_ACAO:     "bg-indigo-100 text-indigo-700",
  USUARIOS:       "bg-gray-100 text-gray-700",
  SISTEMA:        "bg-slate-100 text-slate-700",
}

const ACAO_CORES: Record<string, string> = {
  REGISTRAR:         "text-green-700 bg-green-50",
  CRIAR:             "text-green-700 bg-green-50",
  EDITAR:            "text-blue-700 bg-blue-50",
  ATUALIZAR:         "text-blue-700 bg-blue-50",
  ATUALIZAR_ESTOQUE: "text-blue-700 bg-blue-50",
  INATIVAR:          "text-orange-700 bg-orange-50",
  EXCLUIR:           "text-red-700 bg-red-50",
  LOGIN:             "text-purple-700 bg-purple-50",
  LOGOUT:            "text-gray-700 bg-gray-50",
}

function DeviceIcon({ dispositivo }: { dispositivo: string | null }) {
  if (dispositivo === "Celular")    return <Smartphone  size={14} className="text-blue-500"  />
  if (dispositivo === "Tablet")     return <Tablet      size={14} className="text-purple-500" />
  if (dispositivo === "Computador") return <Monitor     size={14} className="text-gray-500"   />
  return <Globe size={14} className="text-gray-400" />
}

export default function LogsClient({ initialStats }: { initialStats: Stats }) {
  const [logs,        setLogs]        = useState<Log[]>([])
  const [total,       setTotal]       = useState(0)
  const [pages,       setPages]       = useState(1)
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [stats,       setStats]       = useState<Stats>(initialStats)

  // Filtros
  const [modulo,      setModulo]      = useState("")
  const [acao,        setAcao]        = useState("")
  const [dispositivo, setDispositivo] = useState("")
  const [usuario,     setUsuario]     = useState("")
  const [busca,       setBusca]       = useState("")
  const [dataInicio,  setDataInicio]  = useState("")
  const [dataFim,     setDataFim]     = useState("")
  const [detalhes,    setDetalhes]    = useState<string | null>(null)

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (modulo)      params.set("modulo",      modulo)
    if (acao)        params.set("acao",        acao)
    if (dispositivo) params.set("dispositivo", dispositivo)
    if (usuario)     params.set("usuario",     usuario)
    if (busca)       params.set("busca",       busca)
    if (dataInicio)  params.set("dataInicio",  dataInicio)
    if (dataFim)     params.set("dataFim",     dataFim)
    params.set("page", String(pg))

    const res = await fetch(`/api/logs?${params}`)
    if (res.ok) {
      const d = await res.json()
      setLogs(d.logs)
      setTotal(d.total)
      setPages(d.pages)
      setPage(pg)
    }
    setLoading(false)
  }, [modulo, acao, dispositivo, usuario, busca, dataInicio, dataFim])

  // Fetch automático quando filtros mudam
  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  function limpar() {
    setModulo(""); setAcao(""); setDispositivo(""); setUsuario("")
    setBusca(""); setDataInicio(""); setDataFim("")
  }

  const temFiltro = modulo || acao || dispositivo || usuario || busca || dataInicio || dataFim

  const inp = "border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

  // Cards de estatísticas do topo
  const topModulos = Object.entries(stats.modulos)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topDispositivos = Object.entries(stats.dispositivos)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={22} className="text-blue-700" />
            Auditoria do Sistema
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Registro de todas as ações — usuário, IP, dispositivo e navegador
          </p>
        </div>
        <button onClick={() => fetchLogs(page)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-2 transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total geral */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={14} className="text-blue-500" />
            <p className="text-xs text-gray-500">Total registros</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">{stats.total.toLocaleString("pt-BR")}</p>
        </div>

        {/* Dispositivos */}
        {topDispositivos.map(([disp, cnt]) => (
          <div key={disp} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
            onClick={() => setDispositivo(dispositivo === disp ? "" : disp)}
            style={{ cursor: "pointer" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <DeviceIcon dispositivo={disp} />
              <p className="text-xs text-gray-500">{disp}</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">{cnt.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.total > 0 ? ((cnt / stats.total) * 100).toFixed(0) : 0}%
            </p>
          </div>
        ))}

        {/* Null dispositivo */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-gray-400" />
            <p className="text-xs text-gray-500">Sem UA</p>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {(stats.total - Object.values(stats.dispositivos).reduce((a, b) => a + b, 0)).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Módulos */}
      <div className="flex flex-wrap gap-2">
        {topModulos.map(([mod, cnt]) => (
          <button key={mod}
            onClick={() => setModulo(modulo === mod ? "" : mod)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              modulo === mod
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-gray-300"
            } ${MODULO_CORES[mod] ?? "bg-gray-100 text-gray-700"}`}
          >
            {mod}
            <span className="font-bold">{cnt}</span>
          </button>
        ))}
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter size={14} />
          Filtros
          {temFiltro && (
            <button onClick={limpar}
              className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X size={12} />Limpar tudo
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Busca geral */}
          <div className="relative col-span-2 sm:col-span-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Buscar descrição, IP, usuário…"
              value={busca} onChange={e => setBusca(e.target.value)}
              className={`${inp} pl-8 w-full`}
            />
          </div>

          {/* Módulo */}
          <select value={modulo} onChange={e => setModulo(e.target.value)} className={inp}>
            <option value="">Todos os módulos</option>
            {Object.keys(stats.modulos).sort().map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Ação */}
          <select value={acao} onChange={e => setAcao(e.target.value)} className={inp}>
            <option value="">Todas as ações</option>
            {["REGISTRAR","CRIAR","EDITAR","ATUALIZAR","ATUALIZAR_ESTOQUE","INATIVAR","EXCLUIR","LOGIN","LOGOUT"].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Dispositivo */}
          <select value={dispositivo} onChange={e => setDispositivo(e.target.value)} className={inp}>
            <option value="">Todos os dispositivos</option>
            <option value="Computador">Computador</option>
            <option value="Celular">Celular</option>
            <option value="Tablet">Tablet</option>
          </select>

          {/* Usuário */}
          <input
            placeholder="Nome do usuário…"
            value={usuario} onChange={e => setUsuario(e.target.value)}
            className={`${inp} w-full`}
          />

          {/* Datas */}
          <div className="flex items-center gap-1.5 col-span-2">
            <Calendar size={13} className="text-gray-400 shrink-0" />
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inp} />
            <span className="text-gray-400 text-xs">até</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inp} />
            {(dataInicio || dataFim) && (
              <button onClick={() => { setDataInicio(""); setDataFim("") }} className="text-gray-400 hover:text-red-500">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resultado e paginação topo */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {loading ? "Buscando…" : <><strong className="text-gray-800">{total.toLocaleString("pt-BR")}</strong> registro(s) encontrado(s)</>}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <span>Pág. {page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => fetchLogs(page + 1)}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Data/Hora</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Usuário</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Módulo</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Ação</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 min-w-[200px]">Descrição</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">IP</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Dispositivo</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500">Navegador</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                    Carregando…
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    Nenhum registro encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
              {!loading && logs.map((log) => (
                <>
                  <tr key={log.id}
                    className="hover:bg-blue-50/30 transition cursor-pointer"
                    onClick={() => setDetalhes(detalhes === log.id ? null : log.id)}
                  >
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd/MM/yy", { locale: ptBR })}
                      <span className="block font-mono text-gray-400">
                        {format(new Date(log.createdAt), "HH:mm:ss")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium text-gray-700">
                      {log.usuarioNome ?? <span className="text-gray-400 italic">Sistema</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODULO_CORES[log.modulo] ?? "bg-gray-100 text-gray-700"}`}>
                        {log.modulo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${ACAO_CORES[log.acao] ?? "bg-gray-50 text-gray-600"}`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 max-w-xs">
                      <span className="line-clamp-2">{log.descricao}</span>
                      {log.referencia && (
                        <span className="text-gray-400 ml-1">• {log.referencia}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {log.ip ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <DeviceIcon dispositivo={log.dispositivo} />
                        {log.dispositivo ?? <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {log.navegador ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400">
                      {log.userAgent && (
                        <span title="Clique para ver User-Agent completo">
                          <AlertCircle size={13} className="text-blue-300 hover:text-blue-500" />
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Linha expandida: User-Agent completo */}
                  {detalhes === log.id && log.userAgent && (
                    <tr key={`${log.id}-det`} className="bg-blue-50/60">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="text-xs space-y-1">
                          <p className="font-medium text-gray-700 flex items-center gap-1.5">
                            <Globe size={12} />
                            User-Agent completo:
                          </p>
                          <p className="font-mono text-gray-600 break-all bg-white/70 rounded px-2 py-1 border border-blue-100">
                            {log.userAgent}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação rodapé */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
            <ChevronLeft size={14} />Anterior
          </button>
          <span className="px-3">Pág. {page} de {pages}</span>
          <button disabled={page >= pages} onClick={() => fetchLogs(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Próxima<ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
