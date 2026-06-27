"use client"

import { useState, useEffect } from "react"
import { Megaphone, Plus, Loader2, Play, Users, BarChart3, CheckCircle2, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"

export default function BroadcastPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    message_template: "",
    audience_type: "all"
  })

  useEffect(() => {
    if (merchant) {
      fetchData()
    }
  }, [merchant])

  const fetchData = async () => {
    const { data } = await supabase
      .from("broadcast_campaigns")
      .select("*")
      .eq("merchant_id", merchant?.id)
      .order("created_at", { ascending: false })
      
    if (data) setCampaigns(data)
    setLoading(false)
  }

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message_template) return
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('broadcast_campaigns')
        .insert({
          merchant_id: merchant?.id,
          name: newCampaign.name,
          message_template: newCampaign.message_template,
          audience_filter: { type: newCampaign.audience_type },
          status: 'draft'
        })
        
      if (error) throw error
      
      setShowModal(false)
      setNewCampaign({ name: "", message_template: "", audience_type: "all" })
      await fetchData()
    } catch (e: any) {
      alert("Failed to create campaign: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">DRAFT</span>
      case 'pending_approval': return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600">PENDING META APPROVAL</span>
      case 'approved': return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600">APPROVED</span>
      case 'sent': return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600">SENT</span>
      default: return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">{status.toUpperCase()}</span>
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
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Broadcasts</h1>
          <p className="text-[15px] text-slate-500 mt-1">Send targeted WhatsApp campaigns to your audience</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-[16px] bg-[#6366F1] text-white text-[14px] font-bold hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="text-center py-20">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-[16px] font-bold text-slate-900">No campaigns yet</h3>
            <p className="text-[14px] text-slate-500 mt-1">Create your first broadcast campaign to engage customers.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Campaign Name</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Audience</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Performance</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-4 px-6">
                      <p className="text-[14px] font-bold text-slate-900">{camp.name}</p>
                      <p className="text-[12px] text-slate-500 font-medium truncate max-w-[200px]">{camp.message_template}</p>
                    </td>
                    <td className="py-4 px-6">
                      {getStatusBadge(camp.status)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-[13px] text-slate-600 font-medium">
                        <Users className="w-4 h-4 text-slate-400" />
                        {camp.audience_filter?.type === 'all' ? 'All Customers' : camp.audience_filter?.type}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {camp.status === 'sent' ? (
                        <div className="flex items-center gap-4 text-[12px]">
                          <div title="Delivered"><CheckCircle2 className="w-4 h-4 inline text-slate-400 mr-1" />{camp.delivered_count}</div>
                          <div title="Read"><CheckCircle2 className="w-4 h-4 inline text-indigo-400 mr-1" />{camp.read_count}</div>
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {camp.status === 'draft' && (
                        <button className="text-[12px] font-bold text-[#6366F1] bg-[#F3E8FF] px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                          Submit to Meta
                        </button>
                      )}
                      {camp.status === 'approved' && (
                        <button className="text-[12px] font-bold text-white bg-emerald-500 px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors inline-flex items-center gap-1">
                          <Play className="w-3 h-3" /> Send Now
                        </button>
                      )}
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
          <div className="w-[560px] flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#6366F1]" />
                Create Broadcast Campaign
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <span className="font-bold text-lg leading-none">×</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g. Summer Flash Sale"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Target Audience</label>
                <select
                  value={newCampaign.audience_type}
                  onChange={(e) => setNewCampaign({ ...newCampaign, audience_type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="all">All Contacts (Subscribed)</option>
                  <option value="last_30_days">Active in last 30 days</option>
                  <option value="past_buyers">Past Buyers</option>
                  <option value="abandoned_cart">Abandoned Carts (All-time)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Message Template (Meta requires approval)</label>
                <textarea
                  value={newCampaign.message_template}
                  onChange={(e) => setNewCampaign({ ...newCampaign, message_template: e.target.value })}
                  placeholder="Hello {{1}}! We have a special offer for you..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Use {"{{1}}"} for variables like customer name. Campaigns must be approved by Meta before they can be sent.</p>
              </div>

              <button
                onClick={handleCreateCampaign}
                disabled={saving || !newCampaign.name || !newCampaign.message_template}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] disabled:opacity-50 transition-all flex justify-center shadow-lg shadow-indigo-500/25 mt-4"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
