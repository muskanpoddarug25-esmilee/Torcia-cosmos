"use client"

import { useState, createContext, useContext } from "react"
import { DashboardSidebar, DashboardTopbar } from "@/components/dashboard/dashboard-shell"
import { MerchantProvider } from "@/lib/merchant-context"

interface SidebarContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
}
export const SidebarContext = createContext<SidebarContextType>({ sidebarCollapsed: false, setSidebarCollapsed: () => {} })

export const useSidebar = () => useContext(SidebarContext)

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <MerchantProvider>
      <SidebarContext.Provider value={{ sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed }}>
        <div className="min-h-screen bg-[#FAFAFA] text-gray-900 font-sans">
          <DashboardSidebar isCollapsed={collapsed} onToggle={setCollapsed} />
          <div className={`transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${collapsed ? "ml-[80px]" : "ml-[260px]"}`}>
            <DashboardTopbar />
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </SidebarContext.Provider>
    </MerchantProvider>
  )
}
