"use client"

import { useState, useEffect } from "react"
import {
  UserPlus, Shield, ShoppingBag, Eye, Trash2, Loader2,
  Crown, Mail, MoreHorizontal, Check, X
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    desc: "Full access to everything",
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-50 border-amber-200",
  },
  {
    key: "sub_admin",
    label: "Sub Admin",
    desc: "Orders + Payments + Contacts",
    icon: Shield,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50 border-indigo-200",
  },
  {
    key: "order_manager",
    label: "Order Manager",
    desc: "Orders tab only",
    icon: ShoppingBag,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50 border-emerald-200",
  },
]

export default function TeamPage() {
  const supabase = createClient()
  const { merchant, tier } = useMerchant()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteRole, setInviteRole] = useState("order_manager")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (merchant) fetchMembers()
  }, [merchant])

  const fetchMembers = async () => {
    if (!merchant) return
    const { data } = await supabase
      .from("team_members")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName || !merchant) return
    setSaving(true)

    await supabase.from("team_members").insert({
      merchant_id: merchant.id,
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
      status: "active",
    })

    setShowInvite(false)
    setInviteEmail("")
    setInviteName("")
    setInviteRole("order_manager")
    fetchMembers()
    setSaving(false)
  }

  const handleRemove = async (id: string) => {
    await supabase.from("team_members").delete().eq("id", id)
    fetchMembers()
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    await supabase.from("team_members").update({ role: newRole }).eq("id", id)
    fetchMembers()
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Manage who has access to your dashboard and what they can see
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-[12px] font-medium hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/25"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add Team Member
        </button>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map((r) => (
          <div key={r.key} className={`p-4 rounded-xl bg-white border border-gray-200 shadow-sm`}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <r.icon className={`w-4 h-4 ${r.color}`} />
              <span className="text-[13px] font-bold text-gray-800">{r.label}</span>
            </div>
            <p className="text-[11px] text-gray-500">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Owner Card */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Account Owner</span>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <span className="text-white text-sm font-bold">
              {merchant?.business_name?.substring(0, 2).toUpperCase() || "ME"}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-gray-900">{merchant?.business_name || "Store Owner"}</p>
            <p className="text-[12px] text-gray-500">{merchant?.email}</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-bold flex items-center gap-1">
            <Crown className="w-3 h-3" /> Owner
          </span>
        </div>
      </div>

      {/* Team Members */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Team Members ({members.length})
          </span>
        </div>

        {members.length === 0 ? (
          <div className="p-8 text-center">
            <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-gray-600">No team members yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Invite people to help manage your store</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => {
              const roleInfo = ROLES.find((r) => r.key === member.role) || ROLES[2]
              return (
                <div key={member.id} className="p-4 px-5 flex items-center gap-4 hover:bg-gray-50 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold border border-indigo-100">
                    {member.name?.substring(0, 2).toUpperCase() || "TM"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">{member.name}</p>
                    <p className="text-[11px] text-gray-500">{member.email}</p>
                  </div>

                  {/* Role Selector */}
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-indigo-300 transition-all cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowInvite(false)}>
          <div className="w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" /> Add Team Member
              </h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Ram Sharma"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="team@example.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-2">Role</label>
                <div className="space-y-2">
                  {ROLES.filter((r) => r.key !== "admin").map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setInviteRole(r.key)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        inviteRole === r.key
                          ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <r.icon className={`w-4 h-4 ${r.color}`} />
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-gray-800">{r.label}</p>
                        <p className="text-[10px] text-gray-500">{r.desc}</p>
                      </div>
                      {inviteRole === r.key && (
                        <Check className="w-4 h-4 text-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleInvite}
                disabled={saving || !inviteEmail || !inviteName}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] disabled:opacity-50 transition-all flex justify-center shadow-lg shadow-indigo-500/25"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Team Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
