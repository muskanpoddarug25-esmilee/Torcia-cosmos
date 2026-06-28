"use client"

import { useState, useEffect } from "react"
import { Users, Search, Phone, MapPin, Loader2, User, MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"
import { formatNPTDate, formatPhone } from "@/lib/utils"

export default function ContactsPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [contacts, setContacts] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (merchant) fetchContacts()
  }, [merchant])

  const fetchContacts = async () => {
    if (!merchant) return
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })

    setContacts(data || [])
    setLoading(false)
  }

  const filtered = contacts.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.address || "").toLowerCase().includes(search.toLowerCase())
  )

  const getChannelIcon = (platform: string) => {
    if (platform === "whatsapp") return "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
    if (platform === "instagram") return "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"
    if (platform === "messenger") return "https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg"
    if (platform === "tiktok") return "https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg"
    return ""
  }

  // Mock function to simulate multiple channels if they exist, or just the main one.
  const getChannels = (platform: string) => {
    // Ideally this would be an array from DB, here we just return the primary one
    return platform ? [platform] : []
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-3">
            <div className="w-48 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="w-64 h-5 bg-slate-100 rounded-md animate-pulse"></div>
          </div>
          <div className="w-full md:w-96 h-12 bg-slate-100 rounded-2xl animate-pulse"></div>
        </div>
        <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <th key={i} className="py-4 px-6"><div className="w-20 h-4 bg-slate-200 rounded animate-pulse"></div></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-slate-200 rounded animate-pulse"></div>
                          <div className="w-24 h-3 bg-slate-100 rounded animate-pulse"></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6"><div className="w-28 h-4 bg-slate-100 rounded animate-pulse"></div></td>
                    <td className="py-4 px-6"><div className="w-40 h-4 bg-slate-100 rounded animate-pulse"></div></td>
                    <td className="py-4 px-6"><div className="w-16 h-6 bg-slate-100 rounded-lg animate-pulse"></div></td>
                    <td className="py-4 px-6 text-right"><div className="w-8 h-8 bg-slate-100 rounded-xl animate-pulse ml-auto"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Customers</h1>
          <p className="text-slate-500 mt-1 text-[15px]">Manage your {contacts.length} customers and their information.</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or address..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-[18px] font-bold text-slate-900">No contacts yet</h3>
            <p className="text-[14px] text-slate-500 mt-2 max-w-sm mx-auto">Contacts appear here when customers message your store across any channel.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sources</th>
                  <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-[#F8FAFC] transition-colors group">
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#6366F1] text-[13px] font-bold flex-shrink-0">
                          {contact.name?.substring(0, 2).toUpperCase() || <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-[14px] font-bold text-slate-900">{contact.name || "Unknown Customer"}</p>
                          <p className="text-[12px] text-slate-400">
                            Last seen {contact.last_seen_at ? formatNPTDate(contact.last_seen_at) : 'recently'}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span className="text-[13px] font-medium text-slate-700">{formatPhone(contact.phone)}</span>
                      </div>
                    </td>

                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-start gap-2 max-w-[200px]">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-[13px] font-medium text-slate-700 truncate">
                          {contact.address || contact.city || "-"}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6 align-middle">
                      <div className="flex items-center gap-2">
                        {getChannels(contact.platform).map((platform, idx) => {
                          const iconUrl = getChannelIcon(platform)
                          return (
                            <div key={idx} className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {iconUrl && <img src={iconUrl} alt={platform} className="w-3.5 h-3.5 object-contain" />}
                              <span className="text-[11px] font-bold text-slate-600 capitalize">{platform}</span>
                            </div>
                          )
                        })}
                        {/* Mock multiple channels if none exists just to show capability */}
                        {getChannels(contact.platform).length === 0 && (
                          <span className="text-[13px] text-slate-400">-</span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 align-middle text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#6366F1] hover:border-[#6366F1] shadow-sm transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 hover:border-rose-500 shadow-sm transition-all">
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
    </div>
  )
}
