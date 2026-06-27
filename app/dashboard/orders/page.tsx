"use client"

import { useState, useEffect } from "react"
import {
  ShoppingBag, Clock, CheckCircle2, Package, Truck, MapPin,
  Filter, CreditCard, Phone, Loader2, ChevronRight, ChevronLeft, Search,
  ImageIcon, ArrowRight, XCircle, AlertTriangle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"
import { formatNPTDate, formatNPTTime } from "@/lib/utils"

type OrderStatus = "pending" | "paid" | "shipped" | "delivered" | "expired"

const COLUMNS: { key: OrderStatus; label: string; color: string; bgColor: string; icon: React.ElementType }[] = [
  { key: "pending", label: "Pending Payment", color: "text-amber-500", bgColor: "bg-amber-50 border-amber-200", icon: Clock },
  { key: "paid", label: "Paid", color: "text-emerald-500", bgColor: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  { key: "shipped", label: "Shipped", color: "text-blue-500", bgColor: "bg-blue-50 border-blue-200", icon: Truck },
  { key: "delivered", label: "Delivered", color: "text-emerald-400", bgColor: "bg-emerald-50 border-emerald-200", icon: MapPin },
  { key: "expired", label: "Failed / Expired", color: "text-red-500", bgColor: "bg-red-50 border-red-200", icon: XCircle },
]

const STATUS_ORDER: OrderStatus[] = ["pending", "paid", "shipped", "delivered"]

const channelIcon = (ch: string) => ch === "whatsapp" ? "💬" : ch === "instagram" ? "📸" : ch === "tiktok" ? "🎵" : "💙"

const paymentBadge = (method: string) => {
  if (method === "nepalpay") return { label: "NepalPay", color: "bg-blue-100 text-blue-700 border-blue-200" }
  if (method === "fonepay") return { label: "Fonepay", color: "bg-green-100 text-green-700 border-green-200" }
  return { label: "COD", color: "bg-amber-100 text-amber-700 border-amber-200" }
}

export default function OrdersPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const filteredOrders = orders.filter(order => 
    order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_phone?.includes(searchQuery) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    if (!merchant) return
    fetchOrders()

    const ordersSub = supabase
      .channel("orders_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders()
      })
      .subscribe()

    return () => { supabase.removeChannel(ordersSub) }
  }, [merchant])

  const fetchOrders = async () => {
    if (!merchant) return
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const advanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const currentIdx = STATUS_ORDER.indexOf(currentStatus)
    if (currentIdx >= STATUS_ORDER.length - 1) return
    const nextStatus = STATUS_ORDER[currentIdx + 1]

    setUpdatingStatus(orderId)
    await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId)
    
    if (nextStatus === "shipped") {
      try {
        await fetch("/api/orders/notify-shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: orderId })
        })
      } catch (err) {
        console.error("Failed to notify shipping:", err)
      }
    }

    await fetchOrders()
    setUpdatingStatus(null)
  }

  const markDelivered = async (orderId: string) => {
    setUpdatingStatus(orderId)
    await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId)
    await fetchOrders()
    setUpdatingStatus(null)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-[13px] text-gray-500 mt-1">{filteredOrders.length} total orders</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, or ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1) // Reset to page 1 on search
            }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map((col) => {
          const count = orders.filter((o) => o.status === col.key).length
          const total = orders.filter((o) => o.status === col.key).reduce((s, o) => s + (Number(o.amount) || 0), 0)
          return (
            <div key={col.key} className={`p-4 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all`}>
              <div className="flex items-center gap-2 mb-2">
                <col.icon className={`w-4 h-4 ${col.color}`} />
                <span className="text-[11px] font-medium text-gray-500">{col.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Rs. {total.toLocaleString()}</p>
            </div>
          )
        })}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-[15px] font-semibold text-gray-600">No orders found</h3>
          <p className="text-[12px] text-gray-500 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedOrders.map((order) => {
            const statusCol = COLUMNS.find((c) => c.key === order.status) || COLUMNS[0]
            const payment = paymentBadge(order.payment_method || "cod")
            const isUpdating = updatingStatus === order.id
            
            // Extract info from notes
            let txnId = "N/A"
            let remarks = order.notes || ""
            
            if (remarks) {
              const txnMatch = remarks.match(/NepalPay Txn ID:\s*([A-Za-z0-9]+)/)
              if (txnMatch) txnId = txnMatch[1]
              else {
                const qrMatch = remarks.match(/QR ID:\s*([A-Za-z0-9]+)/)
                if (qrMatch) txnId = "Pending: " + qrMatch[1].substring(0, 8)
              }
              
              remarks = remarks
                .replace(/Payment successfully verified via background polling\.\n?/g, '')
                .replace(/NepalPay Txn ID:.*\n?/g, '')
                .replace(/NQR Txn ID:.*\n?/g, '')
                .replace(/QR ID:.*\n?/g, '')
                .trim()
            }

            return (
              <div key={order.id} className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
                <div className="flex items-stretch">
                  {/* Product Image */}
                  <div className="w-32 min-h-[140px] flex-shrink-0 bg-gray-100 border-r border-gray-200 overflow-hidden flex flex-col">
                    {order.product_image_url ? (
                      <img src={order.product_image_url} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center flex-1">
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 p-4 flex items-stretch gap-6">
                    {/* Customer Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Order ID: {order.id.substring(0, 8)}</span>
                        {order.product_tag && (
                          <span className="text-[10px] font-mono text-gray-400">#{order.product_tag}</span>
                        )}
                      </div>
                      <h3 className="text-[15px] font-semibold text-gray-900 truncate">{order.customer_name}</h3>
                      <div className="flex flex-col gap-1.5 mt-2">
                        {order.customer_phone && (
                          <span className="text-[12px] text-gray-600 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" /> {order.customer_phone}
                          </span>
                        )}
                        <span className="text-[12px] text-gray-600 flex items-start gap-1.5 line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" /> {order.delivery_address || "No delivery details"}
                        </span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="w-56 flex-shrink-0 border-l border-gray-100 pl-6 flex flex-col justify-center">
                      <div className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">Product Details</div>
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-3">
                          {order.items.slice(0, 2).map((item: any, i: number) => (
                            <div key={i} className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium text-gray-800 line-clamp-1" title={item.name || item.code}>{item.name || item.code}</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {item.size && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Size: {item.size}</span>}
                                {item.color && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Color: {item.color}</span>}
                                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0 ml-auto">
                                  {item.qty || 1} pcs
                                </span>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full inline-block mt-1">+{order.items.length - 2} more items</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[12px] text-gray-400 italic">No products</span>
                      )}
                    </div>

                    {/* Transaction & Total */}
                    <div className="w-48 flex-shrink-0 border-l border-gray-100 pl-6 flex flex-col justify-center">
                      <div className="text-[10px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">Transaction</div>
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${payment.color}`}>
                            <CreditCard className="w-3 h-3" />
                            {payment.label}
                          </span>
                        </div>
                        
                        {order.status === "pending" && order.abandoned_cart_notified && (
                          <div className="bg-amber-50 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1 w-max mt-1">
                            <AlertTriangle className="w-3 h-3" /> Cart Abandoned
                          </div>
                        )}
                        
                        {(order.status === "expired" || order.payment_status === "expired") ? (
                          <div className="bg-red-50 text-red-600 text-[11px] font-medium px-2 py-1.5 rounded border border-red-100 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Payment Expired
                          </div>
                        ) : (
                          txnId !== "N/A" && (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-gray-400">Transaction ID</span>
                              <span className="text-[11px] font-mono font-medium text-gray-700 bg-gray-50 px-1.5 py-1 rounded border border-gray-100 w-full truncate" title={txnId}>{txnId}</span>
                            </div>
                          )
                        )}
                        
                        <div className="pt-2 border-t border-gray-100 mt-1">
                          <div className="text-[10px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wider">Total Cost</div>
                          <p className="text-[18px] font-bold text-gray-900 leading-none">Rs. {Number(order.amount || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="w-44 flex-shrink-0 bg-gray-50/50 -my-4 -mr-4 p-4 border-l border-gray-100 flex flex-col items-end justify-between">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border shadow-sm ${statusCol.bgColor}`}>
                        <statusCol.icon className={`w-3.5 h-3.5 ${statusCol.color}`} />
                        <span className={statusCol.color}>{statusCol.label}</span>
                      </span>

                      <div className="flex flex-col gap-2 w-full mt-4">
                        {order.status !== "delivered" && order.status !== "expired" && (
                          <>
                            {order.status === "pending" && (
                              <button
                                onClick={() => advanceStatus(order.id, order.status)}
                                disabled={isUpdating}
                                className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"
                              >
                                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mark Paid"}
                              </button>
                            )}
                            {order.status === "paid" && (
                              <button
                                onClick={() => advanceStatus(order.id, order.status)}
                                disabled={isUpdating}
                                className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm"
                              >
                                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Mark Shipped"}
                              </button>
                            )}
                            <button
                              onClick={() => markDelivered(order.id)}
                              disabled={isUpdating}
                              className="w-full py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-600 text-[11px] font-semibold hover:bg-emerald-50 transition-all disabled:opacity-50 flex items-center justify-center shadow-sm"
                            >
                              ✓ Mark Delivered
                            </button>
                          </>
                        )}
                        {order.status === "expired" && (
                          <div className="w-full text-center text-[10px] text-gray-500 italic mt-2">
                            Order is locked due to expired payment.
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-400 mt-auto pt-4">
                        {formatNPTDate(order.created_at)}<br/>{formatNPTTime(order.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4 border-t border-gray-100 mt-4">
          <span className="text-[13px] text-gray-500">
            Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-semibold text-gray-900">{filteredOrders.length}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-gray-200 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`min-w-[28px] h-7 flex items-center justify-center rounded-md text-[12px] font-medium transition-colors shadow-sm ${
                    currentPage === i + 1 
                      ? "bg-indigo-600 text-white border-transparent" 
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-gray-200 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
