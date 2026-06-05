"use client"
import { useState } from "react"
import { QrCode, X, Download, Printer } from "lucide-react"

export default function QRCodeModal({ boxId, boxCodigo }: { boxId: string; boxCodigo: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<{ qrCode: string; url: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function abrir() {
    setOpen(true)
    if (data) return
    setLoading(true)
    const res = await fetch(`/api/boxes/${boxId}/qrcode`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  function imprimir() {
    if (!data) return
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(`
      <html><head><title>QR Code — ${boxCodigo}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:Arial;gap:12px}
      h2{color:#1B6B2E;font-size:24px}p{color:#666;font-size:12px}</style></head>
      <body>
        <h2>Box ${boxCodigo}</h2>
        <img src="${data.qrCode}" width="250" />
        <p>${data.url}</p>
      </body></html>`)
    w.document.close()
    w.print()
  }

  return (
    <>
      <button onClick={abrir} className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition">
        <QrCode size={13} /> QR
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">QR Code — Box {boxCodigo}</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-gray-400">Gerando QR Code...</div>
            ) : data ? (
              <>
                <div className="flex justify-center mb-4">
                  <img src={data.qrCode} alt={`QR ${boxCodigo}`} className="rounded-xl border border-gray-100" width={220} />
                </div>
                <p className="text-xs text-center text-gray-400 mb-4 break-all">{data.url}</p>
                <p className="text-xs text-center text-gray-500 mb-4">Escaneie para ver estoque, produto e histórico do box no celular</p>
                <div className="flex gap-2">
                  <a href={data.qrCode} download={`qr-${boxCodigo}.png`}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                    <Download size={14}/> Salvar
                  </a>
                  <button onClick={imprimir}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-800">
                    <Printer size={14}/> Imprimir
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}
