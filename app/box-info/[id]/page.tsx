import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export const dynamic = "force-dynamic"

export default async function BoxInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const box = await prisma.box.findUnique({
    where: { id },
    include: {
      estoques: { include: { produto: true }, orderBy: { quantidade: "desc" }, take: 1 },
      lacres: { orderBy: { createdAt: "desc" }, take: 1, include: { usuario: { select: { name: true } } } },
      historico: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  })
  if (!box) notFound()

  const vol = box.estoques[0]?.quantidade ?? 0
  const pct = box.capacidade > 0 ? (vol / box.capacidade) * 100 : 0
  const produto = box.estoques[0]?.produto?.descricao
  const lacre = box.lacres[0]
  const cor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : pct >= 40 ? "#22c55e" : "#3b82f6"
  const agora = new Date()

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "Segoe UI, Arial, sans-serif", padding: "20px 16px" }}>
      {/* Header */}
      <div style={{ background: "#1B6B2E", borderRadius: 16, padding: "20px 24px", marginBottom: 16, color: "#fff" }}>
        <div style={{ fontSize: 11, color: "#A5D6A7", marginBottom: 4 }}>PCP ONLINE — Fertalvo</div>
        <div style={{ fontSize: 32, fontWeight: "bold" }}>{box.codigo}</div>
        <div style={{ fontSize: 14, color: "#A5D6A7" }}>{box.descricao} • {box.localizacao}</div>
      </div>

      {/* Nível visual */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, border: `2px solid ${cor}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Volume atual</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: cor }}>{vol.toLocaleString("pt-BR")} ton</div>
          </div>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: cor + "22", border: `3px solid ${cor}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div style={{ fontSize: 20, fontWeight: "bold", color: cor }}>{Math.round(pct)}%</div>
            <div style={{ fontSize: 10, color: cor }}>ocupado</div>
          </div>
        </div>
        <div style={{ height: 12, background: "#e5e7eb", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: cor, borderRadius: 6, transition: "width 0.5s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
          <span>0</span>
          <span>Capacidade: {box.capacidade.toLocaleString("pt-BR")} ton</span>
        </div>
      </div>

      {/* Produto & Cliente */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Conteúdo atual</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Produto</div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#111827", marginTop: 2 }}>{produto ?? "—"}</div>
          </div>
          <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Capacidade livre</div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#1B6B2E", marginTop: 2 }}>{(box.capacidade - vol).toLocaleString("pt-BR")} ton</div>
          </div>
        </div>
      </div>

      {/* Lacre */}
      {lacre && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Último Lacre</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>Código: {lacre.codigoLacre ?? "—"}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>Por: {lacre.usuario?.name ?? lacre.nomeLacrador ?? "—"}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{format(new Date(lacre.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
            </div>
            <div style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: "bold",
              background: lacre.status === "FECHADO" ? "#dcfce7" : lacre.status === "NAO_CONFORME" ? "#fee2e2" : "#fef9c3",
              color: lacre.status === "FECHADO" ? "#166534" : lacre.status === "NAO_CONFORME" ? "#991b1b" : "#713f12",
            }}>
              {lacre.status === "NAO_CONFORME" ? "⚠ NÃO CONFORME" : lacre.status}
            </div>
          </div>
        </div>
      )}

      {/* Histórico */}
      {box.historico.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Últimas Atualizações</div>
          {box.historico.map((h) => (
            <div key={h.id} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{h.acao}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{format(new Date(h.createdAt), "dd/MM HH:mm", { locale: ptBR })}</span>
              </div>
              {h.produto && <div style={{ fontSize: 11, color: "#6b7280" }}>{h.produto} {h.volume ? `• ${h.volume} ton` : ""}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11, marginTop: 8 }}>
        Consultado em {format(agora, "dd/MM/yyyy HH:mm", { locale: ptBR })}
      </div>
    </div>
  )
}
