"use client"

import { useState, useEffect } from "react"
import { FileText, Plus, Loader2, Search, Trash2, Download, Send, CreditCard } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"

export default function InvoicesPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [invoices, setInvoices] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // New invoice state
  const [newInvoice, setNewInvoice] = useState({
    contact_id: "",
    due_date: "",
    notes: "",
    items: [{ description: "", quantity: 1, rate: 0 }],
    tax_rate: 0
  })

  useEffect(() => {
    if (merchant) {
      fetchData()
    }
  }, [merchant])

  const fetchData = async () => {
    const [invRes, conRes] = await Promise.all([
      supabase.from("invoices").select("*, contacts(name, phone)").eq("merchant_id", merchant?.id).order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").eq("merchant_id", merchant?.id).order("name", { ascending: true })
    ])
    
    if (invRes.data) setInvoices(invRes.data)
    if (conRes.data) setContacts(conRes.data)
    
    setLoading(false)
  }

  const handleGenerateInvoice = async () => {
    if (!newInvoice.contact_id || newInvoice.items.length === 0) return
    setSaving(true)
    
    // 1. Calculate totals
    const calculatedItems = newInvoice.items.map(item => ({
      ...item,
      amount: item.quantity * item.rate
    }))
    
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0)
    const tax_amount = subtotal * (newInvoice.tax_rate / 100)
    const total = subtotal + tax_amount
    
    // 2. Generate Invoice Number
    const invoice_number = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    
    try {
      // 3. Save to DB
      const { data: inserted, error } = await supabase
        .from('invoices')
        .insert({
          merchant_id: merchant?.id,
          contact_id: newInvoice.contact_id,
          invoice_number,
          items: calculatedItems,
          subtotal,
          tax_rate: newInvoice.tax_rate,
          tax_amount,
          total,
          due_date: newInvoice.due_date || null,
          notes: newInvoice.notes
        })
        .select()
        .single()
        
      if (error) throw error

      // 4. Trigger PDF Generation via our API route
      const res = await fetch('/api/invoices/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inserted.id })
      })
      
      if (res.ok) {
        setShowModal(false)
        setNewInvoice({ contact_id: "", due_date: "", notes: "", items: [{ description: "", quantity: 1, rate: 0 }], tax_rate: 0 })
        await fetchData()
      } else {
        alert("Invoice created, but PDF generation failed.")
      }
    } catch (e: any) {
      console.error(e)
      alert("Failed to create invoice: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    await supabase.from("invoices").delete().eq("id", id)
    fetchData()
  }

  const handleSendWhatsApp = async (invoice: any) => {
    if (!invoice.pdf_url) return alert("No PDF URL available to send.")
    // We would trigger a WhatsApp message API here. 
    // For now, just alert or open WhatsApp Web.
    const text = `Hi ${invoice.contacts?.name || ''}, here is your invoice #${invoice.invoice_number} for ${invoice.currency} ${invoice.total}. You can view and download it here: ${invoice.pdf_url}`
    window.open(`https://wa.me/${invoice.contacts?.phone}?text=${encodeURIComponent(text)}`, '_blank')
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
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-[15px] text-slate-500 mt-1">Generate PDF invoices and payment links for your clients</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-[16px] bg-[#6366F1] text-white text-[14px] font-bold hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-slate-900">No invoices yet</h3>
            <p className="text-[14px] text-slate-500 mt-1">Create your first invoice to send to a client.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoice No.</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-[14px] font-bold text-slate-900">{inv.invoice_number}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-[14px] font-bold text-slate-900">{inv.contacts?.name || 'Unknown'}</p>
                      <p className="text-[12px] text-slate-500 font-medium">{inv.contacts?.phone || ''}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[13px] text-slate-600 font-medium">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[14px] font-bold text-slate-900">{inv.currency} {Number(inv.total).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        inv.status === 'paid' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      }`}>
                        {inv.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.pdf_url && (
                          <>
                            <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Download PDF">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleSendWhatsApp(inv)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Send WhatsApp">
                              <Send className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(inv.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
          <div className="w-[800px] max-h-[90vh] flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6366F1]" />
                Create New Invoice
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <span className="font-bold text-lg leading-none">×</span>
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Client</label>
                  <select
                    value={newInvoice.contact_id}
                    onChange={(e) => setNewInvoice({ ...newInvoice, contact_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select a client...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.phone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[12px] font-semibold text-gray-700">Line Items</label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    <div className="flex-1">Description</div>
                    <div className="w-24">Qty</div>
                    <div className="w-32">Rate (NPR)</div>
                    <div className="w-10"></div>
                  </div>
                  
                  {newInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <input 
                        type="text" 
                        placeholder="Service description"
                        value={item.description}
                        onChange={(e) => {
                          const items = [...newInvoice.items]
                          items[idx].description = e.target.value
                          setNewInvoice({ ...newInvoice, items })
                        }}
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px]"
                      />
                      <input 
                        type="number" 
                        min="1"
                        value={item.quantity || ''}
                        onChange={(e) => {
                          const items = [...newInvoice.items]
                          items[idx].quantity = Number(e.target.value)
                          setNewInvoice({ ...newInvoice, items })
                        }}
                        className="w-24 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px]"
                      />
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={item.rate || ''}
                        onChange={(e) => {
                          const items = [...newInvoice.items]
                          items[idx].rate = Number(e.target.value)
                          setNewInvoice({ ...newInvoice, items })
                        }}
                        className="w-32 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px]"
                      />
                      <button 
                        onClick={() => {
                          if (newInvoice.items.length === 1) return
                          const items = newInvoice.items.filter((_, i) => i !== idx)
                          setNewInvoice({ ...newInvoice, items })
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => {
                      setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: "", quantity: 1, rate: 0 }] })
                    }}
                    className="text-[13px] font-bold text-indigo-600 hover:text-indigo-700 py-2 inline-flex"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Notes (Optional)</label>
                  <textarea
                    value={newInvoice.notes}
                    onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                    placeholder="Thank you for your business..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] resize-none"
                  />
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold">Rs. {newInvoice.items.reduce((s, i) => s + (i.quantity * i.rate), 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-slate-500">Tax (%)</span>
                    <input 
                      type="number" 
                      value={newInvoice.tax_rate}
                      onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: Number(e.target.value) })}
                      className="w-16 px-2 py-1 text-right bg-white border border-slate-200 rounded text-[13px]"
                    />
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-[14px]">Total</span>
                    <span className="font-bold text-[#6366F1] text-[18px]">
                      Rs. {(
                        newInvoice.items.reduce((s, i) => s + (i.quantity * i.rate), 0) * (1 + newInvoice.tax_rate / 100)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-[24px]">
              <button 
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl text-[14px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoice}
                disabled={saving || !newInvoice.contact_id || !newInvoice.items[0].description}
                className="flex items-center justify-center min-w-[160px] py-2.5 rounded-xl bg-[#6366F1] hover:bg-indigo-600 text-white font-bold text-[14px] disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Invoice PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
