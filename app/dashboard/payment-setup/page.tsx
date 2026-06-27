"use client"

import { useState, useEffect } from "react"
import {
  CreditCard, Shield, Eye, EyeOff, CheckCircle2, XCircle,
  Trash2, Lock, AlertTriangle, QrCode,
  Loader2, WifiOff, Wifi, Edit3, X
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"

type Provider = "nepalpay" | "fonepay"
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface ProviderState {
  username: string
  password: string
  showPassword: boolean
  status: ConnectionStatus
  lastLogin: string | null
  error: string | null
  merchantCode: string | null
  tokenExpiry: string | null
  isActive: boolean
  isEditing: boolean
}

export default function PaymentSetupPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [activeTab, setActiveTab] = useState<Provider>("nepalpay")
  const [testQrLoading, setTestQrLoading] = useState(false)
  const [testQrResult, setTestQrResult] = useState<string | null>(null)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrStringData, setQrStringData] = useState<string | null>(null)

  const [providers, setProviders] = useState<Record<Provider, ProviderState>>({
    nepalpay: {
      username: "", password: "", showPassword: false,
      status: "disconnected", lastLogin: null, error: null,
      merchantCode: null, tokenExpiry: null, isActive: true, isEditing: false,
    },
    fonepay: {
      username: "", password: "", showPassword: false,
      status: "disconnected", lastLogin: null, error: null,
      merchantCode: null, tokenExpiry: null, isActive: true, isEditing: false,
    },
  })

  useEffect(() => {
    if (merchant) loadCredentials()
  }, [merchant])

  const loadCredentials = async () => {
    if (!merchant) return
    const { data: creds } = await supabase
      .from("payment_credentials")
      .select("*")
      .eq("merchant_id", merchant.id)

    if (creds) {
      creds.forEach((c: any) => {
        if (c.provider === "nepalpay" || c.provider === "fonepay") {
          updateProvider(c.provider, {
            status: c.is_connected ? "connected" : "disconnected",
            merchantCode: c.merchant_code,
            lastLogin: c.last_login_at ? new Date(c.last_login_at).toLocaleString() : null,
            isActive: c.is_active !== false,
            username: "",
            password: "",
            isEditing: false,
          })
        }
      })
    }
  }

  const updateProvider = (provider: Provider, updates: Partial<ProviderState>) => {
    setProviders((prev) => ({ ...prev, [provider]: { ...prev[provider], ...updates } }))
  }

  const handleToggle = async (provider: Provider) => {
    const newState = !providers[provider].isActive
    updateProvider(provider, { isActive: newState })

    if (merchant) {
      const { data: existing } = await supabase.from("payment_credentials").select("id").eq("merchant_id", merchant.id).eq("provider", provider).single()
      if (existing) {
        await supabase.from("payment_credentials").update({ is_active: newState }).eq("id", existing.id)
      } else {
        await supabase.from("payment_credentials").insert({ merchant_id: merchant.id, provider, is_active: newState, is_connected: false })
      }
    }
  }

  const handleConnect = async (provider: Provider) => {
    const p = providers[provider]
    if (!p.username || !p.password) return

    updateProvider(provider, { status: "connecting", error: null })

    try {
      const res = await fetch("/api/payment/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, username: p.username, password: p.password, merchantId: merchant?.id }),
      })
      const data = await res.json()

      if (data.success) {
        // Credentials are now securely saved by the server-side API

        updateProvider(provider, {
          status: "connected",
          lastLogin: new Date().toLocaleString(),
          merchantCode: data.merchantCode,
          tokenExpiry: data.tokenExpiry,
          error: null,
          username: "", 
          password: "", 
          isEditing: false,
        })
      } else {
        updateProvider(provider, { status: "error", error: data.message || "Connection failed" })
      }
    } catch {
      updateProvider(provider, { status: "error", error: "Network error. Please try again." })
    }
  }

  const handleDisconnect = async (provider: Provider) => {
    if (merchant) {
      await supabase
        .from("payment_credentials")
        .delete()
        .eq("merchant_id", merchant.id)
        .eq("provider", provider)
    }
    updateProvider(provider, {
      status: "disconnected", username: "", password: "",
      lastLogin: null, merchantCode: null, tokenExpiry: null, error: null, isEditing: false,
    })
  }

  const handleStartEdit = (provider: Provider) => {
    updateProvider(provider, { isEditing: true, username: "", password: "" })
  }

  const handleCancelEdit = (provider: Provider) => {
    updateProvider(provider, { isEditing: false, username: "", password: "" })
  }

  const handleTestQr = async () => {
    setTestQrLoading(true)
    setTestQrResult(null)
    setQrStringData(null)
    try {
      const res = await fetch("/api/payment/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeTab, amount: 1, remarks: "Test QR", merchantId: merchant?.id }),
      })
      const data = await res.json()
      if (data.success) {
        setTestQrResult("✅ QR generated successfully!")
        // NepalPay base64 string often contains newlines which break the <img> src attribute
        const sanitizedQr = data.qrString.replace(/[\r\n\s]+/g, '')
        setQrStringData(sanitizedQr.startsWith('data:image') ? sanitizedQr : `data:image/png;base64,${sanitizedQr}`)
        setShowQrDialog(true)
      } else {
        setTestQrResult(`❌ ${data.message}`)
      }
    } catch {
      setTestQrResult("❌ Failed to generate test QR")
    }
    setTestQrLoading(false)
  }

  const p = providers[activeTab]

  const statusConfig = {
    disconnected: { color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-100", icon: WifiOff, label: "Not Connected" },
    connecting: { color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100", icon: Loader2, label: "Connecting..." },
    connected: { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", icon: Wifi, label: "Connected" },
    error: { color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", icon: XCircle, label: "Error" },
  }

  const sc = statusConfig[p.status]

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Payment Setup</h1>
        <p className="text-[15px] text-slate-500 mt-1">
          Connect your NepalPay or Fonepay business account to accept payments via QR code automatically.
        </p>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-2 gap-6">
        {(["nepalpay", "fonepay"] as Provider[]).map((prov) => {
          const isActive = activeTab === prov
          const provState = providers[prov]
          const isConnected = provState.status === "connected"

          return (
            <div
              key={prov}
              onClick={() => setActiveTab(prov)}
              role="button"
              tabIndex={0}
              className={`relative overflow-hidden rounded-[24px] border p-6 text-left transition-all duration-300 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? "border-indigo-300 bg-white shadow-md ring-4 ring-indigo-50"
                  : "border-slate-100 bg-white hover:border-slate-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#6366F1]"></div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center ${
                    prov === "nepalpay"
                      ? "bg-blue-500 text-white"
                      : "bg-emerald-500 text-white"
                  } shadow-sm`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900">{prov === "nepalpay" ? "NepalPay" : "Fonepay"}</h3>
                    <p className="text-[12px] text-slate-500 font-medium">QR Payment Gateway</p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggle(prov) }}
                  className={`relative w-12 h-7 rounded-full transition-all duration-300 ${
                    provState.isActive ? "bg-emerald-500 shadow-sm shadow-emerald-500/20" : "bg-slate-200"
                  }`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300 ${
                    provState.isActive ? "left-[22px]" : "left-0.5"
                  }`} />
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[12px] font-bold text-emerald-700">Connected</span>
                  </div>
                ) : (
                  <span className="text-[12px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">Not connected</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Connection Card */}
      <div className="relative rounded-[24px] overflow-hidden border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-violet-50 rounded-full blur-3xl pointer-events-none"></div>

        {/* Status Bar */}
        <div className={`relative flex items-center justify-between px-6 py-4 ${sc.bg} border-b ${sc.border}`}>
          <div className="flex items-center gap-3">
            <sc.icon className={`w-5 h-5 ${sc.color} ${p.status === "connecting" ? "animate-spin" : ""}`} />
            <span className={`text-[14px] font-bold ${sc.color}`}>{sc.label}</span>
          </div>
          {p.lastLogin && (
            <span className="text-[12px] text-slate-500 font-medium">Last login: {p.lastLogin}</span>
          )}
        </div>

        {/* Form */}
        <div className="relative p-8 space-y-6">
          {activeTab === "fonepay" ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full bg-emerald-50 border-8 border-white shadow-sm flex items-center justify-center mx-auto mb-6">
                  <CreditCard className="w-10 h-10 text-emerald-500" />
                </div>
                <div className="absolute -top-2 -right-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Coming Soon</span>
                </div>
              </div>
              <h3 className="text-[20px] font-bold text-slate-900">Fonepay Integration</h3>
              <p className="text-[14px] text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                Fonepay QR integration is under development. You'll be notified when it's ready to connect.
              </p>
            </div>
          ) : (
            <>
              {p.status === "connected" && !p.isEditing ? (
                <>
                  <div className="relative overflow-hidden p-6 rounded-[20px] border border-emerald-100 bg-emerald-50/30">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          <span className="text-[16px] font-bold text-emerald-700">Account Connected</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-[16px] bg-white border border-emerald-100 shadow-sm">
                          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Merchant Code</p>
                          <p className="text-[16px] text-slate-900 font-mono font-bold mt-1">{p.merchantCode}</p>
                        </div>
                        <div className="p-4 rounded-[16px] bg-white border border-emerald-100 shadow-sm">
                          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Token Expires</p>
                          <p className="text-[15px] text-slate-900 font-medium mt-1">{p.tokenExpiry || "Auto-refresh"}</p>
                        </div>
                      </div>

                      <div className="mt-4 p-4 rounded-[16px] bg-white border border-emerald-100 shadow-sm">
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">Credentials</p>
                        <p className="text-[13px] text-slate-600 font-medium">
                          <Lock className="w-4 h-4 inline mr-1.5 text-emerald-500 relative -top-0.5" />
                          Username and password are securely stored (AES-256-GCM encrypted)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleTestQr}
                      disabled={testQrLoading}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[14px] font-bold hover:bg-slate-100 transition-all disabled:opacity-40 shadow-sm"
                    >
                      {testQrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      Test QR (Rs. 1)
                    </button>
                    <button
                      onClick={() => handleStartEdit(activeTab)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[14px] font-bold hover:bg-slate-100 transition-all shadow-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Update Credentials
                    </button>
                    <button
                      onClick={() => handleDisconnect(activeTab)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-rose-500 text-[14px] font-bold hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      Disconnect
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {p.isEditing && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                      <span className="text-[13px] text-amber-700 font-bold">
                        ✏️ Updating credentials — enter new username and password
                      </span>
                      <button onClick={() => handleCancelEdit(activeTab)} className="text-amber-500 hover:text-amber-700 bg-white rounded-full p-1 border border-amber-200 shadow-sm">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-2">
                        NepalPay Business Username
                      </label>
                      <input
                        type="text"
                        value={p.username}
                        onChange={(e) => updateProvider(activeTab, { username: e.target.value })}
                        placeholder="Enter your NepalPay username"
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-[16px] text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 mb-2">
                        NepalPay Business Password
                      </label>
                      <div className="relative">
                        <input
                          type={p.showPassword ? "text" : "password"}
                          value={p.password}
                          onChange={(e) => updateProvider(activeTab, { password: e.target.value })}
                          placeholder="Enter your password"
                          className="w-full px-5 py-4 pr-12 bg-slate-50 border border-slate-200 rounded-[16px] text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6366F1] focus:ring-4 focus:ring-indigo-50 transition-all"
                        />
                        <button
                          onClick={() => updateProvider(activeTab, { showPassword: !p.showPassword })}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full border border-slate-200 shadow-sm transition-all"
                        >
                          {p.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {p.error && (
                    <div className="flex items-center gap-3 p-4 mt-6 rounded-[16px] bg-rose-50 border border-rose-100">
                      <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                      <p className="text-[13px] text-rose-600 font-bold">{p.error}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-8 border-t border-slate-100 mt-6">
                    <button
                      onClick={() => handleConnect(activeTab)}
                      disabled={!p.username || !p.password || p.status === "connecting"}
                      className="flex items-center gap-2 px-8 py-4 rounded-[16px] bg-[#6366F1] hover:bg-indigo-600 text-white text-[14px] font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {p.status === "connecting" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                      {p.status === "connecting" ? "Connecting..." : p.isEditing ? "Update & Reconnect" : "Connect Account"}
                    </button>
                    {p.isEditing && (
                      <button
                        onClick={() => handleCancelEdit(activeTab)}
                        className="px-6 py-4 rounded-[16px] text-slate-500 text-[14px] font-bold hover:text-slate-700 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </>
              )}

              {testQrResult && (
                <div className={`p-4 mt-6 rounded-[16px] text-[13px] font-bold border ${
                  testQrResult.startsWith("✅")
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                    : "bg-rose-50 border-rose-100 text-rose-500"
                }`}>
                  {testQrResult}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showQrDialog && qrStringData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowQrDialog(false)}>
          <div className="w-[400px] flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Scan QR Code</h3>
            <div className="bg-slate-50 p-4 rounded-2xl flex justify-center items-center mb-6">
              <img src={qrStringData} alt="Test QR Code" className="w-64 h-64 object-contain" />
            </div>
            <button
              onClick={() => setShowQrDialog(false)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
