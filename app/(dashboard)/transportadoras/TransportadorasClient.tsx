"use client"
import { useState } from "react"
import { Plus, Truck, Pencil, Check, X } from "lucide-react"

type Transportadora = { id: string; codigo: string; nome: string; cnpj: string | null; contato: string | null; telefone: string | null; ativo: boolean }

export default function TransportadorasClient({ transportadoras: inicial }: { transportadoras: Transportadora[] }) {
  const [lista, setLista] = useState(inicial)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Transportadora | null>(null)
  const [form, setForm] = useState({ codigo: "", nome: "", cnpj: "", contato: "", telefone: "" })
  const [saving, setSaving] = useState(false)

  function openNew() { setEditing(null); setForm({ codigo: "", nome: "", cnpj: "", contato: "", telefone: "" }); setShowModal(true) }
  function openEdit(t: Transportadora) { setEditing(t); setForm({ codigo: t.codigo, nome: t.nome, cnpj: t.cnpj ?? "", contato: t.contato ?? "", telefone: t.telefone ?? "" }); setShowModal(true) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const url = editing ? `/api/transportadoras/${editing.id}` : "/api/transportadoras"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    const data = await res.json()
    if (editing) setLista((p) => p.map((t) => t.id === data.id ? data : t))
    else setLista((p) => [...p, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    setSaving(false); setShowModal(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Truck size={22} className="text-blue-600" /> Transportadoras</h2>
          <p className="text-gray-500 text-sm mt-0.5">{lista.filter(t=>t.ativo).length} transportadoras ativas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={15} /> Nova Transportadora
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Código","Nome","CNPJ","Contato","Telefone","Status",""].map((h)=><th key={h} className="px-4 py-3 text-left font-medium text-gray-500 text-xs">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {lista.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-mono text-xs font-bold text-blue-700">{t.codigo}</td>
                <td className="px-4 py-2.5 font-medium text-gray-800">{t.nome}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{t.cnpj ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{t.contato ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{t.telefone ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${t.ativo ? "text-green-700" : "text-gray-400"}`}>
                    {t.ativo ? <Check size={12}/> : <X size={12}/>} {t.ativo ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => openEdit(t)} className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Pencil size={14}/></button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-400">Nenhuma transportadora cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="font-bold text-gray-800 text-lg mb-4">{editing ? "Editar" : "Nova"} Transportadora</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[{f:"codigo",l:"Código *"},{f:"nome",l:"Nome *"},{f:"cnpj",l:"CNPJ"},{f:"contato",l:"Contato"},{f:"telefone",l:"Telefone"}].map(({f,l})=>(
                  <div key={f} className={f==="nome"?"col-span-2":""}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{l}</label>
                    <input value={form[f as keyof typeof form]} onChange={(e)=>setForm(p=>({...p,[f]:e.target.value}))} required={l.includes("*")}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-800 disabled:opacity-60">{saving?"Salvando…":editing?"Atualizar":"Criar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
