"use client"

import { useMerchant } from "@/lib/merchant-context"
import { ArrowUpRight, ArrowDownRight, MessageSquare, ShoppingBag, TrendingUp, TrendingDown, Zap, Clock, CheckCircle, Bot } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatNPTTime } from "@/lib/utils"

export default function DashboardOverviewPage() {
  const { merchant } = useMerchant()
  const businessName = merchant?.business_name || "Store Owner"
  const supabase = createClient()
  const [liveChats, setLiveChats] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [revenueChange, setRevenueChange] = useState<number | null>(null)
  const [aiHandledChats, setAiHandledChats] = useState(0)
  const [chatsChange, setChatsChange] = useState<number | null>(null)
  const [timeSavedText, setTimeSavedText] = useState("0m saved")
  const [activeOrders, setActiveOrders] = useState(0)
  const [escalatedChatsCount, setEscalatedChatsCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!merchant) return
    const fetchConvs = async () => {
      const { data } = await supabase
        .from('conversations')
        .select(`*, contact:contacts(*)`)
        .eq('merchant_id', merchant.id)
        .order('last_message_at', { ascending: false })
        .limit(3)
      if (data) setLiveChats(data)
    }

    const fetchStats = async () => {
      const now = new Date()
      // Current period: Last 30 days
      const startOfCurrentPeriod = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      // Previous period: 60 days ago to 30 days ago
      const startOfPreviousPeriod = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()
      const endOfPreviousPeriod = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // 1. Total Revenue
      const { data: revDataCur } = await supabase.from('orders').select('amount').eq('merchant_id', merchant.id).eq('status', 'delivered').gte('created_at', startOfCurrentPeriod)
      const revCur = revDataCur?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0
      setTotalRevenue(revCur)

      const { data: revDataPrev } = await supabase.from('orders').select('amount').eq('merchant_id', merchant.id).eq('status', 'delivered').gte('created_at', startOfPreviousPeriod).lte('created_at', endOfPreviousPeriod)
      const revPrev = revDataPrev?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0
      setRevenueChange(revPrev > 0 ? ((revCur - revPrev) / revPrev) * 100 : (revCur > 0 ? 100 : 0))

      // 2. AI Handled Chats (All conversations in the last 30 days)
      const { count: chatsCur } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).gte('created_at', startOfCurrentPeriod)
      setAiHandledChats(chatsCur || 0)

      const { count: chatsPrev } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).gte('created_at', startOfPreviousPeriod).lte('created_at', endOfPreviousPeriod)
      setChatsChange(chatsPrev && chatsPrev > 0 ? (((chatsCur || 0) - chatsPrev) / chatsPrev) * 100 : ((chatsCur || 0) > 0 ? 100 : 0))

      // 3. Time Saved Calculation
      const { data: aiMessages } = await supabase.from('messages').select('content').eq('merchant_id', merchant.id).eq('is_ai_generated', true).gte('created_at', startOfCurrentPeriod)
      const totalAiMessages = aiMessages?.length || 0
      let qrCount = 0
      if (aiMessages) {
        aiMessages.forEach(msg => {
          if (msg.content?.includes('[QR Code Sent]')) qrCount++
        })
      }
      const { data: verifiedOrders } = await supabase.from('orders').select('id').eq('merchant_id', merchant.id).ilike('notes', '%Payment verified via Vision AI%').gte('created_at', startOfCurrentPeriod)
      
      const replyTime = totalAiMessages * 25
      const qrTime = qrCount * 60
      const verificationTime = (verifiedOrders?.length || 0) * 45
      const totalSecondsSaved = replyTime + qrTime + verificationTime
      const hoursSaved = Math.floor(totalSecondsSaved / 3600)
      const minutesSaved = Math.floor((totalSecondsSaved % 3600) / 60)
      setTimeSavedText(hoursSaved > 0 ? `${hoursSaved}h ${minutesSaved}m saved` : `${minutesSaved}m saved`)

      // Active Orders
      const { count: ordCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).in('status', ['paid', 'pending'])
      setActiveOrders(ordCount || 0)

      // Escalated Chats Count
      const { count: escCount } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'escalated')
      setEscalatedChatsCount(escCount || 0)

      // Out of Stock Count
      const { count: oosCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('in_stock', false)
      setOutOfStockCount(oosCount || 0)
    }

    Promise.all([fetchConvs(), fetchStats()]).then(() => {
      setLoading(false)
    })

    const channelId = `dashboard_overview_conversations_${Math.random()}`
    const sub = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConvs()
        fetchStats()
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [merchant])

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">
            Good morning, {businessName}
          </h1>
          <p className="text-slate-500 mt-1 text-[15px]">
            Here's what's happening with your store today.
          </p>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 h-[140px] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="w-24 h-4 bg-slate-200 rounded animate-pulse"></div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse"></div>
                </div>
                <div className="w-32 h-8 bg-slate-200 rounded animate-pulse mt-4"></div>
                <div className="w-20 h-3 bg-slate-100 rounded animate-pulse mt-2"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-slate-50 rounded-[24px] h-[80px] animate-pulse border border-slate-100"></div>
            <div className="bg-slate-50 rounded-[24px] h-[80px] animate-pulse border border-slate-100"></div>
          </div>
          <div className="bg-white rounded-[24px] border border-slate-100 h-[300px] animate-pulse"></div>
        </>
      ) : (
        <>
          {/* Top Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1: Total Revenue */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-slate-500">Total Revenue</h3>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(revenueChange ?? 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {(revenueChange ?? 0) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[36px] font-bold text-slate-900 tracking-tight leading-none mb-1">
                <span className="text-[20px] text-slate-400 font-semibold mr-1">Rs.</span>{totalRevenue.toLocaleString()}
              </span>
              <span className="text-[13px] text-slate-500 font-medium">Last 30 days</span>
            </div>
            {revenueChange !== null && (
              <div className={`flex items-center gap-1 px-2.5 py-1 text-[12px] font-bold rounded-full ${revenueChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {revenueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Card 2: AI Handled Chats */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-slate-500">AI Handled Chats</h3>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[36px] font-bold text-slate-900 tracking-tight leading-none mb-1">
                {aiHandledChats}
              </span>
              <span className="text-[13px] text-indigo-500 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {timeSavedText}
              </span>
            </div>
            {chatsChange !== null && (
              <div className={`flex items-center gap-1 px-2.5 py-1 text-[12px] font-bold rounded-full ${chatsChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {chatsChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {chatsChange >= 0 ? '+' : ''}{chatsChange.toFixed(1)}%
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Active Orders */}
        <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-[14px] font-semibold text-slate-500">Active Orders</h3>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[36px] font-bold text-slate-900 tracking-tight leading-none mb-1">
                {activeOrders}
              </span>
              <span className="text-[13px] text-slate-500 font-medium">
                Active orders to fulfill
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {escalatedChatsCount > 0 ? (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-rose-900">{escalatedChatsCount} Chats require Human Intervention</p>
                <p className="text-[13px] text-rose-700">Customers requested to speak with a human agent.</p>
              </div>
            </div>
            <Link href="/dashboard/inbox" className="px-4 py-2 bg-white text-rose-600 font-bold text-[13px] rounded-xl shadow-sm hover:shadow-md transition-all">
              Review
            </Link>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-emerald-900">0 Chats require Human Intervention</p>
                <p className="text-[13px] text-emerald-700">All caught up! 🎉 AI is handling everything.</p>
              </div>
            </div>
            <Link href="/dashboard/inbox" className="px-4 py-2 bg-white text-emerald-600 font-bold text-[13px] rounded-xl shadow-sm hover:shadow-md transition-all">
              Inbox
            </Link>
          </div>
        )}
        
        {outOfStockCount > 0 ? (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-amber-900">{outOfStockCount} Products are Out of Stock</p>
                <p className="text-[13px] text-amber-700">Restock inventory to avoid missing sales.</p>
              </div>
            </div>
            <Link href="/dashboard/products" className="px-4 py-2 bg-white text-amber-600 font-bold text-[13px] rounded-xl shadow-sm hover:shadow-md transition-all">
              Update
            </Link>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-emerald-900">Inventory looks good</p>
                <p className="text-[13px] text-emerald-700">All essential products are in stock.</p>
              </div>
            </div>
            <Link href="/dashboard/products" className="px-4 py-2 bg-white text-emerald-600 font-bold text-[13px] rounded-xl shadow-sm hover:shadow-md transition-all">
              Manage
            </Link>
          </div>
        )}
      </div>

      {/* Live AI Inbox Section */}
      <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-[18px] font-bold text-slate-900">Live AI Inbox</h2>
            <p className="text-[13px] text-slate-500 mt-1">Real-time conversations handled by Torcia AI</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[12px] font-bold text-emerald-700">Torcia AI Active</span>
          </div>
        </div>
        
        <div className="divide-y divide-slate-100">
          {liveChats.length === 0 && (
            <div className="p-10 text-center text-slate-500 text-[14px]">No active conversations.</div>
          )}
          {liveChats.map((chat) => {
            const name = chat.contact?.name || "Customer"
            const initial = name.substring(0, 2).toUpperCase()
            const time = formatNPTTime(chat.last_message_at)
            
            return (
              <Link href="/dashboard/inbox" key={chat.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#F3E8FF] text-[#6366F1] flex items-center justify-center font-bold">
                    {initial}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[14px] font-bold text-slate-900">{name}</p>
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md capitalize">{chat.platform}</span>
                    </div>
                    <p className="text-[13px] text-slate-500 truncate max-w-[300px] md:max-w-md">{chat.last_message_preview || "Started conversation"}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[12px] text-slate-400">{time}</span>
                  {chat.status === "active" ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      <Bot className="w-3.5 h-3.5" />
                      <span className="ml-0.5">Handled by AI</span>
                    </div>
                  ) : chat.status === "escalated" ? (
                    <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md">
                      ⚠️ Needs review
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                      ✓ Handled
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
        
        <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
          <Link href="/dashboard/inbox" className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 block w-full">
            View all conversations →
          </Link>
        </div>
      </div>
      </>
      )}
    </div>
  )
}
