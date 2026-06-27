"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface MerchantContext {
  user: any
  merchant: any
  tier: any
  role: string
  loading: boolean
  refreshMerchant: () => Promise<void>
}

const MerchantCtx = createContext<MerchantContext>({
  user: null,
  merchant: null,
  tier: null,
  role: "admin",
  loading: true,
  refreshMerchant: async () => {},
})

export const useMerchant = () => useContext(MerchantCtx)

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [merchant, setMerchant] = useState<any>(null)
  const [tier, setTier] = useState<any>(null)
  const [role, setRole] = useState("admin")
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const fetchMerchant = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        // Get merchant by user_id
        const { data: merchants } = await supabase
          .from("merchants")
          .select("*, subscription_tier:subscription_tiers(*)")
          .eq("user_id", authUser.id)
          .limit(1)

        const m = merchants?.[0]

        if (m) {
          setMerchant(m)
          setTier(m.subscription_tier)
        } else {
          // Check if user is a team member
          const { data: teamMembers } = await supabase
            .from("team_members")
            .select("*, merchant:merchants(*, subscription_tier:subscription_tiers(*))")
            .eq("email", authUser.email)
            .eq("status", "active")
            .limit(1)

          const teamMember = teamMembers?.[0]

          if (teamMember) {
            setRole(teamMember.role)
            setMerchant(teamMember.merchant)
            setTier(teamMember.merchant?.subscription_tier)
          } else {
            // Auth user exists but no merchant record — redirect to onboarding
            if (pathname && !pathname.includes("/onboarding") && !pathname.includes("/auth")) {
              window.location.href = "/onboarding"
            }
          }
        }
      } else {
        // No auth user
        if (pathname && !pathname.includes("/auth") && !pathname.includes("/onboarding") && pathname !== "/") {
          window.location.href = "/auth/login"
        }
      }
    } catch (err) {
      console.error("fetchMerchant error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMerchant()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchMerchant()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <MerchantCtx.Provider value={{ user, merchant, tier, role, loading, refreshMerchant: fetchMerchant }}>
      {children}
    </MerchantCtx.Provider>
  )
}
