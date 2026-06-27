"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMerchant } from "@/lib/merchant-context"
import { createClient } from "@/lib/supabase/client"
import {
  MessageSquare,
  ShoppingBag,
  CreditCard,
  Bot,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Zap,
  Users,
  Package,
  UserPlus,
  Crown,
  Sparkles,
  LayoutDashboard,
  Megaphone,
  Ticket,
  ShieldCheck
} from "lucide-react"

type SidebarItem = {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
  roles?: string[] // which roles can see this item
  categories?: string[] // which categories can see this item
}

type SidebarSection = {
  section: string
  items: SidebarItem[]
}

const sidebarItems: SidebarSection[] = [
  {
    section: "MAIN",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, badge: 0, roles: ["admin", "sub_admin"] },
      { href: "/dashboard/inbox", label: "Inbox", icon: MessageSquare, badge: 0, roles: ["admin", "sub_admin"] },
      { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag, badge: 0, roles: ["admin", "sub_admin", "order_manager"], categories: ["physical", "digital"] },
      { href: "/dashboard/invoices", label: "Invoices", icon: CreditCard, roles: ["admin", "sub_admin"], categories: ["consultancy"] },
      { href: "/dashboard/tickets", label: "Tickets", icon: Ticket, badge: 0, roles: ["admin", "sub_admin"] },
      { href: "/dashboard/contacts", label: "Customers", icon: Users, roles: ["admin", "sub_admin"] },
    ],
  },
  {
    section: "COMMERCE & PRO",
    items: [
      { href: "/dashboard/products", label: "Products", icon: Package, roles: ["admin", "sub_admin"], categories: ["physical", "digital"] },
      { href: "/dashboard/gift-codes", label: "Gift Codes", icon: Ticket, roles: ["admin", "sub_admin"], categories: ["digital"] },
      { href: "/dashboard/broadcast", label: "Broadcasts", icon: Megaphone, roles: ["admin"] },
      { href: "/dashboard/automations", label: "Automations", icon: Zap, roles: ["admin", "sub_admin"] },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      { href: "/dashboard/ai-settings", label: "Torcia AI", icon: () => <img src="/torcia-icon.png" className="w-5 h-5 object-contain" />, roles: ["admin"] },
      { href: "/dashboard/payment-setup", label: "Payments & KYC", icon: ShieldCheck, roles: ["admin", "sub_admin"] },
      { href: "/dashboard/team", label: "Team Access", icon: UserPlus, roles: ["admin"] },
      { href: "/dashboard/billing", label: "Billing & Usage", icon: CreditCard, roles: ["admin"] },
      { href: "/dashboard/settings", label: "Account Settings", icon: Settings, roles: ["admin"] },
    ],
  },
]

export function DashboardSidebar({ isCollapsed, onToggle }: { isCollapsed?: boolean, onToggle?: (c: boolean) => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { merchant, tier, role, user } = useMerchant()
  const [localCollapsed, setLocalCollapsed] = useState(false)
  
  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed
  const handleToggle = () => {
    if (onToggle) onToggle(!collapsed)
    else setLocalCollapsed(!collapsed)
  }

  const [unreadCount, setUnreadCount] = useState(0)

  React.useEffect(() => {
    if (!merchant) return
    
    const fetchUnread = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('merchant_id', merchant.id)
        .gt('unread_count', 0)
      
      if (data) {
        const count = data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)
        setUnreadCount(count)
      }
    }
    
    fetchUnread()
    
    const channelId = `sidebar_unread_${Math.random()}`
    const sub = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchUnread()
      })
      .subscribe()
      
    return () => { supabase.removeChannel(sub) }
  }, [merchant])

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  // Filter sidebar items based on role and category
  const filteredSections = sidebarItems
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const roleMatch = !item.roles || item.roles.includes(role);
        const categoryMatch = !item.categories || (merchant?.store_category && item.categories.includes(merchant.store_category));
        return roleMatch && categoryMatch;
      }),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        collapsed ? "w-[80px]" : "w-[260px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-20">
        <Link href="/" className="flex items-center gap-2">
          {collapsed ? (
            <img src="/torcia-icon.png" alt="Torcia" className="w-8 h-8 object-contain" />
          ) : (
            <img src="/torcia-full.png" alt="Torcia" className="h-8 w-auto object-contain" />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-8 scrollbar-none">
        {filteredSections.map((section, idx) => (
          <div key={section.section}>
            {!collapsed && idx !== 0 && (
              <p className="px-4 mb-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {section.section}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href)
                const isInbox = item.href === "/dashboard/inbox"
                const displayBadge = isInbox ? unreadCount : item.badge
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all duration-300 ${
                      active
                        ? "bg-[#F3E8FF] text-[#6366F1]" // Light purple background with brand colored text
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-[#6366F1]" : "text-slate-400 group-hover:text-slate-600"}`} />
                    {!collapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                    
                    {!collapsed && displayBadge !== undefined && displayBadge > 0 && (
                      <span className="w-6 h-6 rounded-full bg-[#6366F1] text-white text-[11px] font-bold flex items-center justify-center">
                        {displayBadge > 99 ? '99+' : displayBadge}
                      </span>
                    )}
                    
                    {!collapsed && item.label.includes("AI") && !item.badge && item.label !== "Torcia AI" && (
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-6 mt-auto">
        {/* Subscription Badge */}
        {!collapsed && tier && !localCollapsed && (
          <div className="mb-6 relative p-4 rounded-2xl bg-gradient-to-br from-[#F3E8FF] to-[#E0E7FF] border border-[#E0E7FF] shadow-sm">
            <button 
              onClick={(e) => { e.stopPropagation(); setLocalCollapsed(true); }}
              className="absolute top-2 right-2 p-1 text-[#6366F1]/50 hover:text-[#6366F1] rounded-lg transition-colors hover:bg-white/50"
              title="Hide"
            >
              <span className="font-bold leading-none text-xl">×</span>
            </button>
            <div className="flex items-center gap-1.5 mb-1">
              <Crown className="w-4 h-4 text-[#6366F1]" />
              <span className="text-[13px] font-bold text-[#6366F1] uppercase tracking-wide">{tier.display_name}</span>
            </div>
            <p className="text-[12px] text-slate-500 font-medium mb-3">{tier?.metadata?.ai_reply_limit ? `0 / ${tier.metadata.ai_reply_limit} limits` : "Free tier"}</p>
            {tier.name !== "pro" && (
              <Link href="/dashboard/billing" className="inline-block px-4 py-1.5 bg-white text-[#6366F1] rounded-xl text-[12px] font-bold shadow-sm hover:shadow-md transition-all">
                Upgrade
              </Link>
            )}
          </div>
        )}

        <div className="space-y-1">
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!collapsed && <span>Collapse menu</span>}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </aside>
  )
}

export function DashboardTopbar() {
  const { merchant, user, role } = useMerchant()
  const businessName = merchant?.business_name || "My Store"
  const initials = businessName.substring(0, 2).toUpperCase()
  const pathname = usePathname()
  
  // Format current date: "Monday, October 24"
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  
  // Create breadcrumb from pathname
  const getBreadcrumb = () => {
    if (pathname === "/dashboard") return "Overview"
    const paths = pathname.split("/").filter(Boolean)
    const lastPath = paths[paths.length - 1]
    return lastPath.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  }

  return (
    <header className="h-20 bg-white/80 backdrop-blur-2xl flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 text-[13px] font-medium text-slate-400 mb-0.5">
          <span>Torcia</span>
          <span>/</span>
          <span className="text-[#6366F1]">{getBreadcrumb()}</span>
        </div>
        <div className="text-[12px] text-slate-400">{currentDate}</div>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-full text-slate-400 hover:text-[#6366F1] hover:bg-[#F3E8FF] transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white"></span>
        </button>

        {/* Profile */}
        <div className="w-10 h-10 rounded-full bg-[#8B5CF6] flex items-center justify-center shadow-sm cursor-pointer hover:shadow-md transition-all">
          <span className="text-white text-[14px] font-bold">
            {initials.charAt(0)}
          </span>
        </div>
      </div>
    </header>
  )
}
