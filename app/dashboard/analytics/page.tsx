"use client"

import { useState, useEffect } from "react"
import { BarChart3, TrendingUp, Users, ShoppingBag, MessageSquare, Clock, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"
import { formatNPTDate } from "@/lib/utils"

export default function AnalyticsPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [orders, setOrders] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (merchant) fetchData()
  }, [merchant])

  const fetchData = async () => {
    if (!merchant) return
    const { data: ords } = await supabase.from('orders').select('*').eq('merchant_id', merchant.id).order('created_at', { ascending: false })
    const { data: convs } = await supabase.from('conversations').select('*').eq('merchant_id', merchant.id)
    
    setOrders(ords || [])
    setConversations(convs || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  // Calculate stats
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
  const activeConversations = conversations.filter(c => c.status === 'active' || c.status === 'ai_handling').length

  const stats = [
    { label: "Total Revenue", value: `Rs. ${totalRevenue.toLocaleString()}`, change: "+0%", up: true, icon: TrendingUp },
    { label: "Total Orders", value: orders.length.toString(), change: "+0%", up: true, icon: ShoppingBag },
    { label: "Active Conversations", value: activeConversations.toString(), change: "+0%", up: true, icon: MessageSquare },
    { label: "Avg Response Time", value: "< 30s", change: "-0%", up: true, icon: Clock },
  ]

  // Channel breakdown
  const platforms = ["whatsapp", "instagram", "messenger"]
  const channelData = platforms.map(platform => {
    const platformOrders = orders.filter(o => o.platform === platform)
    const revenue = platformOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
    const pct = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
    return {
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      orders: platformOrders.length,
      revenue,
      pct
    }
  }).filter(c => c.orders > 0 || c.name === "Whatsapp")

  const recentOrders = orders.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-[13px] text-gray-500 mt-1">Overview of your business performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 transition-all shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-5 h-5 text-indigo-500" />
              <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${stat.up ? "text-emerald-500" : "text-red-500"}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-[11px] text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Channel Breakdown */}
        <div className="col-span-2 rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Channel Breakdown</h3>
          <div className="space-y-4">
            {channelData.length === 0 && <p className="text-[13px] text-gray-500">No data available</p>}
            {channelData.map((ch) => (
              <div key={ch.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-medium text-gray-700">{ch.name}</span>
                  <span className="text-[12px] text-gray-500">{ch.orders} orders · Rs. {ch.revenue.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      ch.name === "WhatsApp" ? "bg-emerald-500" :
                      ch.name === "Instagram" ? "bg-pink-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${ch.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
          <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.length === 0 && <p className="text-[13px] text-gray-500">No recent orders</p>}
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-[12px] font-medium text-gray-900">{o.customer_name}</p>
                  <p className="text-[10px] text-gray-500">{o.id.substring(0,8)} · {formatNPTDate(o.created_at)}</p>
                </div>
                <span className="text-[13px] font-semibold text-gray-900">Rs. {Number(o.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
