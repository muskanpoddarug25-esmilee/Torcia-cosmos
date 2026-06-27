"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"
import { Ticket, Search, Filter, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react"
import { formatNPTDateTime } from "@/lib/utils"

export default function TicketsPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolvingTicket, setResolvingTicket] = useState<any>(null)
  const [resolveText, setResolveText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (merchant) {
      fetchTickets()
    }
  }, [merchant])

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, contact:contacts(*), order:orders(*)')
      .eq('merchant_id', merchant?.id)
      .order('created_at', { ascending: false })
    
    if (error) console.error(error)
    setTickets(data || [])
    setLoading(false)
  }

  const handleResolveClick = (ticket: any) => {
    setResolvingTicket(ticket)
    setResolveText("")
    setShowResolveModal(true)
  }

  const handleResolveSubmit = async () => {
    if (!resolvingTicket) return;
    setIsSubmitting(true);
    
    // 1. Update ticket in DB
    const { error } = await supabase.from('tickets').update({ 
      status: 'resolved',
      resolution_notes: resolveText || null
    }).eq('id', resolvingTicket.id)
    
    if (!error) {
      setTickets(prev => prev.map(t => t.id === resolvingTicket.id ? { ...t, status: 'resolved', resolution_notes: resolveText || null } : t))
      
      // 2. Find active conversation
      const { data: conv } = await supabase.from('conversations')
        .select('id, platform, contact:contacts(phone, platform_customer_id)')
        .eq('contact_id', resolvingTicket.contact_id)
        .order('last_message_at', { ascending: false })
        .limit(1).single()
        
      if (conv) {
        const ticketNumber = resolvingTicket.id.substring(0,8).toUpperCase()
        const msg = resolveText 
          ? `Hello! Your ticket #${ticketNumber} has been resolved. Details: ${resolveText}`
          : `Hello! Your ticket #${ticketNumber} has been successfully resolved. Let us know if you need anything else!`;
          
        await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            conversation_id: conv.id, 
            content: msg,
            channel: conv.platform,
            platform_customer_id: conv.contact?.platform_customer_id || conv.contact?.phone
          })
        })
      }
    }
    
    setIsSubmitting(false);
    setShowResolveModal(false);
    setResolvingTicket(null);
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
      </div>
    )
  }

  const indexOfLastTicket = currentPage * itemsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - itemsPerPage;
  const currentTickets = tickets.slice(indexOfFirstTicket, indexOfLastTicket);
  const totalPages = Math.ceil(tickets.length / itemsPerPage) || 1;

  return (
    <div className="max-w-6xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative min-h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-[#6366F1]" />
            Customer Tickets
          </h1>
          <p className="text-[15px] text-slate-500 font-medium mt-2">
            Manage issues and support requests generated from the inbox.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-indigo-100 outline-none w-64 shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span className="text-[13px] font-bold">Filter</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-900 mb-1">No tickets found</h3>
            <p className="text-[14px] text-slate-500">Tickets generated from customer conversations will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ticket ID</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ticket Details</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Linked Order</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[13px] font-medium text-slate-600 font-mono">#{t.id.substring(0,8).toUpperCase()}</span>
                        <span className="text-[11px] text-slate-400">{formatNPTDateTime(t.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[14px] font-bold text-slate-900">{t.title}</p>
                      {t.description && <p className="text-[13px] text-slate-500 mt-0.5 truncate max-w-xs">{t.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F3E8FF] text-[#6366F1] flex items-center justify-center text-[11px] font-bold">
                          {t.contact?.name?.substring(0,2).toUpperCase() || "CU"}
                        </div>
                        <span className="text-[13px] font-semibold text-slate-700">{t.contact?.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.priority ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          t.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                          t.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {t.priority}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {t.order ? (
                        <button className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors text-left max-w-[160px]">
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-bold text-slate-900 truncate">
                              {t.order.items && Array.isArray(t.order.items) && t.order.items.length > 0 
                                ? t.order.items.map((i: any) => i.name).join(', ') 
                                : `Order #${t.order.id.substring(0,8)}`}
                            </span>
                            <span className={`text-[9px] font-bold mt-0.5 ${
                              t.order.status === 'delivered' ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {t.order.status.toUpperCase()}
                            </span>
                          </div>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        t.status === 'open' ? 'bg-amber-100 text-amber-700' : 
                        t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      {t.status === 'open' && (
                        <button 
                          onClick={() => handleResolveClick(t)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[12px] font-bold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {tickets.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[13px] text-slate-500 font-medium">
              Showing {indexOfFirstTicket + 1} to {Math.min(indexOfLastTicket, tickets.length)} of {tickets.length} tickets
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 transition-colors bg-white shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[13px] font-bold text-slate-700 px-2">{currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 transition-colors bg-white shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Resolve Modal */}
      {showResolveModal && resolvingTicket && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-[24px]" onClick={() => setShowResolveModal(false)}>
          <div className="w-[450px] bg-white rounded-[24px] shadow-2xl border border-slate-100 p-6 m-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-slate-900 mb-1">Resolve Ticket</h3>
            <p className="text-[13px] text-slate-500 mb-5">
              Add optional resolution notes. We'll automatically notify the customer.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Resolution Details</label>
                <textarea 
                  value={resolveText}
                  onChange={e => setResolveText(e.target.value)}
                  placeholder="e.g. Processed refund to original payment method..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>
              
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Actions</p>
                <div className="flex flex-wrap gap-2">
                  {['Refund Processed', 'Item Replaced', 'Issue Resolved via Chat'].map(action => (
                    <button
                      key={action}
                      onClick={() => setResolveText(action)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResolveSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 text-[13px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Complete Resolution</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
