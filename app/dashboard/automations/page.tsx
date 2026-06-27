"use client"

import { Zap } from "lucide-react"

export default function AutomationsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
        <p className="text-[13px] text-gray-500 mt-1">Create automated workflows for your messaging channels</p>
      </div>
      <div className="text-center py-20 rounded-2xl bg-white border border-gray-200">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-7 h-7 text-indigo-400/40" />
        </div>
        <h3 className="text-[15px] font-semibold text-gray-600">Coming Soon</h3>
        <p className="text-[12px] text-gray-500 mt-1 max-w-sm mx-auto">
          Automation workflows with triggers, conditions, and actions are under development.
        </p>
      </div>
    </div>
  )
}
