"use client"

import { useState, useEffect } from "react"
import { Ticket, Plus, Loader2, Package, CheckCircle2, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"

export default function GiftCodesPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [codesInput, setCodesInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<Record<string, { available: number, total: number }>>({})

  useEffect(() => {
    if (merchant) {
      fetchProducts()
    }
  }, [merchant])

  const fetchProducts = async () => {
    // Only digital products or all products for digital store
    const { data: prodData } = await supabase
      .from("products")
      .select("*")
      .eq("merchant_id", merchant?.id)
      .order("created_at", { ascending: false })

    if (prodData) {
      setProducts(prodData)
      
      // Fetch stats
      const { data: codesData } = await supabase
        .from("gift_codes")
        .select("product_id, status")
        .eq("merchant_id", merchant?.id)
        
      const newStats: Record<string, { available: number, total: number }> = {}
      prodData.forEach(p => {
        newStats[p.id] = { available: 0, total: 0 }
      })
      
      if (codesData) {
        codesData.forEach(code => {
          if (newStats[code.product_id]) {
            newStats[code.product_id].total++
            if (code.status === 'available') {
              newStats[code.product_id].available++
            }
          }
        })
      }
      setStats(newStats)
    }
    setLoading(false)
  }

  const handleAddCodes = async () => {
    if (!selectedProduct || !codesInput.trim()) return
    setSaving(true)
    
    const codesArray = codesInput.split('\n').map(c => c.trim()).filter(c => c)
    
    try {
      const res = await fetch('/api/gift-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          codes: codesArray
        })
      })
      
      if (res.ok) {
        setCodesInput("")
        setShowModal(false)
        await fetchProducts()
      } else {
        alert("Failed to save codes.")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Digital Gift Codes</h1>
          <p className="text-[15px] text-slate-500 mt-1">Manage encrypted inventory for your digital products</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-slate-900">No products found</h3>
            <p className="text-[14px] text-slate-500 mt-1">Create a product first in the Products tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Price</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Available Codes</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="text-[14px] font-bold text-slate-900">{p.name}</p>
                      <p className="text-[12px] text-slate-500 font-medium">#{p.product_tag}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[14px] font-bold text-slate-900">Rs. {Number(p.price).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-bold ${
                          (stats[p.id]?.available || 0) > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {stats[p.id]?.available || 0} ready to send
                        </span>
                        <span className="text-[12px] text-slate-400 font-medium">
                          / {stats[p.id]?.total || 0} total added
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => { setSelectedProduct(p); setShowModal(true); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[13px] font-bold transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Codes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-[500px] flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-indigo-500" />
                  Add Gift Codes
                </h3>
                <p className="text-[13px] text-slate-500 mt-1">For: <span className="font-bold text-slate-700">{selectedProduct?.name}</span></p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <span className="font-bold text-lg leading-none">×</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-[13px] text-amber-800">
                <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600" />
                <p>Codes are AES-256-GCM encrypted in the database immediately upon saving. They will only be decrypted and dispatched automatically after a successful payment.</p>
              </div>
              
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Paste Codes (One per line)</label>
                <textarea
                  value={codesInput}
                  onChange={(e) => setCodesInput(e.target.value)}
                  placeholder="XXXX-YYYY-ZZZZ&#10;AAAA-BBBB-CCCC&#10;1234-5678-9012"
                  rows={6}
                  className="w-full px-4 py-2.5 font-mono text-[13px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
                <p className="text-[12px] text-slate-500 font-medium mt-2 text-right">
                  {codesInput.split('\n').map(c => c.trim()).filter(c => c).length} valid codes found
                </p>
              </div>

              <button
                onClick={handleAddCodes}
                disabled={saving || codesInput.trim() === ""}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] disabled:opacity-50 transition-all flex justify-center shadow-lg shadow-indigo-500/25"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Encrypt & Save Codes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
