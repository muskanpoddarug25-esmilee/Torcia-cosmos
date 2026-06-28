"use client"

import { useState, useEffect, useRef } from "react"
import React from "react"
import {
  MessageSquare, Search, Filter, Plus, Phone,
  MoreHorizontal, Send, Paperclip, ImageIcon,
  Bot, CheckCheck, Star, ShoppingBag, CreditCard,
  Loader2, UserX, Box, MapPin, PanelRightClose, PanelRightOpen,
  User as UserIcon, Link2Off, Link2, AlertCircle, Sparkles, Brain, ClipboardList, X
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"
import { formatNPTTime, formatPhone } from "@/lib/utils"
import { useSidebar } from "@/app/dashboard/layout"

type Channel = "all" | "whatsapp" | "instagram" | "messenger" | "tiktok" | "gmail"
type ChatFilter = "all" | "ai_handling" | "human_needed" | "resolved"

const CHANNELS: { key: Channel; label: string; iconUrl: string; comingSoon?: boolean; connected?: boolean }[] = [
  { key: "all", label: "All Channels", iconUrl: "", connected: true },
  { key: "whatsapp", label: "WhatsApp", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg", connected: true },
  { key: "instagram", label: "Instagram", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg", connected: false },
  { key: "messenger", label: "Messenger", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/b/be/Facebook_Messenger_logo_2020.svg", connected: true },
  { key: "tiktok", label: "TikTok", iconUrl: "https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg", connected: false },
  { key: "gmail", label: "Gmail", iconUrl: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg", connected: false },
]

export default function InboxPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [selectedChannel, setSelectedChannel] = useState<Channel>("all")
  const [selectedFilter, setSelectedFilter] = useState<ChatFilter>("all")
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [selectedChat, setSelectedChat] = useState<any>(null)
  const [messageInput, setMessageInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [showProductModal, setShowProductModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [customerTickets, setCustomerTickets] = useState<any[]>([])
  const [customerOrders, setCustomerOrders] = useState<any[]>([])
  const [searchProductQuery, setSearchProductQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrAmount, setQrAmount] = useState("")
  const [qrRemarks, setQrRemarks] = useState("")
  const [showQrProductSuggestions, setShowQrProductSuggestions] = useState(false)
  const [isSendingQR, setIsSendingQR] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [assignedTo, setAssignedTo] = useState<string>("ai")
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [ticketInput, setTicketInput] = useState({ title: "", description: "", priority: "medium", order_id: "" })
  const { sidebarCollapsed } = useSidebar()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 120)}px`;
  }
  const [channelsCollapsed, setChannelsCollapsed] = useState(!sidebarCollapsed)

  useEffect(() => {
    setChannelsCollapsed(!sidebarCollapsed)
  }, [sidebarCollapsed])
  
  // Fake toggle for AI state
  const [aiPaused, setAiPaused] = useState(false)
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchInitialData()

    // Poll fallback
    const pollInterval = setInterval(() => {
      fetchInitialData()
    }, 4000)

    const convSub = supabase
      .channel('conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchInitialData()
      })
      .subscribe()

    const msgSub = supabase
      .channel('messages_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const newMsg = payload.new as any
        setSelectedChat((currentChat: any) => {
          if (currentChat && newMsg.conversation_id === currentChat.id) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id || (m.id.startsWith("temp-") && m.content === newMsg.content))) {
                return [newMsg, ...prev.filter(m => !(m.id.startsWith("temp-") && m.content === newMsg.content) && m.id !== newMsg.id)]
              }
              return [newMsg, ...prev]
            })
          }
          return currentChat
        })
      })
      .subscribe()

    const msgSubUpdate = supabase
      .channel('messages_changes_update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, payload => {
        const updatedMsg = payload.new as any
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
      })
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(convSub)
      supabase.removeChannel(msgSub)
      supabase.removeChannel(msgSubUpdate)
    }
  }, [])

  const selectedChatRef = React.useRef<any>(null)
  useEffect(() => {
    selectedChatRef.current = selectedChat
    if (selectedChat) {
      fetchMessages(selectedChat.id)
      setAiPaused(selectedChat.status === "escalated")
      setAssignedTo(selectedChat.status === "escalated" ? "human" : "ai")
      if (selectedChat.contact?.id) {
        supabase.from('tickets').select('*').eq('contact_id', selectedChat.contact.id).order('created_at', { ascending: false })
          .then(({ data }) => setCustomerTickets(data || []))
        supabase.from('orders').select('*').eq('contact_id', selectedChat.contact.id).order('created_at', { ascending: false })
          .then(({ data }) => setCustomerOrders(data || []))
      }
    } else {
      setMessages([])
      setCustomerTickets([])
    }
  }, [selectedChat?.id])

  const fetchInitialData = async () => {
    try {
      const { data: convs, error: convsErr } = await supabase
        .from('conversations')
        .select(`*, contact:contacts(*)`)
        .order('last_message_at', { ascending: false })
      
      if (convsErr) console.error('Error fetching conversations:', convsErr)
      setConversations(convs || [])

      if (merchant) {
        const { data: prods } = await supabase.from('products').select('*').eq('merchant_id', merchant.id)
        setProducts(prods || [])
        const { data: team } = await supabase.from('team_members').select('*').eq('merchant_id', merchant.id)
        setTeamMembers(team || [])
      }
    } catch (e) {
      console.error('Fetch initial data failed:', e)
    } finally {
      setLoading(false)
      setHasLoaded(true)
    }
  }

  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: false })
    if (data) setMessages(data)
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat) return
    const content = messageInput
    setMessageInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Optimistic UI Update
    const tempMsg = {
      id: "temp-" + Date.now(),
      conversation_id: selectedChat.id,
      content: content,
      sender_type: "agent",
      is_ai_generated: false,
      message_type: "text",
      created_at: new Date().toISOString()
    }
    setMessages(prev => [tempMsg, ...prev])

    try {
      await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedChat.id,
          content,
        }),
      })
    } catch (err) {
      console.error("Failed to send message:", err)
    }
  }

  const toggleAIPaused = async () => {
    const newState = !aiPaused
    setAiPaused(newState)
    
    // Optimistic update of status
    if (selectedChat) {
      await supabase.from('conversations').update({
        status: newState ? 'escalated' : 'active'
      }).eq('id', selectedChat.id)
      fetchInitialData()
    }
  }

  const getChannelIcon = (platform: string) => {
    const ch = CHANNELS.find(c => c.key === platform)
    if (ch && ch.iconUrl) {
      return <img src={ch.iconUrl} alt={platform} className="w-5 h-5 object-contain" />
    }
    return <MessageSquare className="w-4 h-4" />
  }

  const formatPhone = (phone?: string) => {
    if (!phone) return "Unknown"
    if (phone.startsWith("+")) return phone
    if (phone.length === 10) return `+977 ${phone}`
    return phone
  }

  const handleCreateTicket = async () => {
    if (!ticketInput.title || !merchant || !selectedChat?.contact?.id) return
    const { data, error } = await supabase.from('tickets').insert({
      merchant_id: merchant.id,
      contact_id: selectedChat.contact.id,
      title: ticketInput.title,
      description: ticketInput.description,
      priority: ticketInput.priority,
      order_id: ticketInput.order_id || null,
      status: 'open'
    }).select().single()

    if (!error && data) {
      setCustomerTickets(prev => [data, ...prev])
      setShowTicketModal(false)
      setTicketInput({ title: "", description: "", priority: "medium", order_id: "" })

      // Send automated message to customer
      const ticketNumber = data.id.substring(0,8).toUpperCase();
      const messageContent = `A support ticket has been created for your issue. Reference: #${ticketNumber}. We will notify you once it is resolved.`;
      
      const channel = selectedChat.platform;
      const platformCustomerId = selectedChat.contact?.platform_customer_id || selectedChat.contact?.phone;

      try {
        await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: selectedChat.id,
            content: messageContent,
            channel: channel,
            platform_customer_id: platformCustomerId
          }),
        })
      } catch (err) {
        console.error("Failed to send automated ticket creation message:", err)
      }
    }
  }

  const filteredConversations = conversations.filter(c => {
    if (selectedChannel !== "all" && c.platform !== selectedChannel) return false;
    if (selectedFilter === "ai_handling" && c.status === "escalated") return false;
    if (selectedFilter === "human_needed" && c.status !== "escalated") return false;
    if (selectedFilter === "resolved" && c.status !== "resolved") return false;
    if (searchQuery && !c.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden animate-in fade-in duration-500">
        {/* Column 1 */}
        <div className="w-[220px] flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-[24px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1 flex flex-col">
            <div className="w-32 h-5 bg-slate-200 rounded animate-pulse mb-6"></div>
            <div className="space-y-3 mb-8">
              {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-10 bg-slate-100 rounded-2xl animate-pulse"></div>)}
            </div>
            <div className="w-16 h-3 bg-slate-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="w-full h-10 bg-slate-100 rounded-2xl animate-pulse"></div>)}
            </div>
          </div>
        </div>
        {/* Column 2 */}
        <div className="w-[300px] flex-shrink-0 flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="p-4 border-b border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <div className="w-24 h-5 bg-slate-200 rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-slate-100 rounded-full animate-pulse"></div>
            </div>
            <div className="w-full h-8 bg-slate-50 rounded-xl animate-pulse"></div>
          </div>
          <div className="flex-1 p-3 space-y-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-full p-3 flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 animate-pulse"></div>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex justify-between">
                    <div className="w-24 h-3 bg-slate-200 rounded animate-pulse"></div>
                    <div className="w-10 h-2 bg-slate-100 rounded animate-pulse"></div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Column 3 */}
        <div className="flex-1 flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse"></div>
              <div className="space-y-2">
                <div className="w-32 h-4 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-24 h-3 bg-slate-100 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse"></div>
          </div>
          <div className="flex-1 bg-[#FAFAFA] p-6 flex flex-col gap-6 justify-end">
            <div className="self-end w-64 h-16 bg-slate-200 rounded-3xl rounded-tr-sm animate-pulse"></div>
            <div className="self-start w-72 h-20 bg-slate-200 rounded-3xl rounded-tl-sm animate-pulse"></div>
            <div className="self-end w-48 h-12 bg-slate-200 rounded-3xl rounded-tr-sm animate-pulse"></div>
          </div>
          <div className="p-4 border-t border-slate-100">
            <div className="w-full h-12 bg-slate-50 rounded-[20px] animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* COLUMN 1: Channels & Filters */}
      <div className={`flex-shrink-0 flex flex-col gap-4 transition-all duration-300 ${channelsCollapsed ? 'w-[80px]' : 'w-[220px]'}`}>
        <div className="bg-white rounded-[24px] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1 flex flex-col overflow-y-auto scrollbar-none relative">
          
          <div className={`flex items-center mb-4 px-2 ${channelsCollapsed ? 'justify-center' : 'justify-between'}`}>
            <h2 className={`text-[15px] font-bold text-slate-900 transition-opacity whitespace-nowrap ${channelsCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
              Inbox Channels
            </h2>
            <button 
              onClick={() => setChannelsCollapsed(!channelsCollapsed)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors flex-shrink-0"
              title={channelsCollapsed ? "Expand Channels" : "Collapse Channels"}
            >
              {channelsCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="space-y-1 mb-8">
            {CHANNELS.map((ch) => (
              <div key={ch.key} className="flex flex-col gap-1 mb-1">
                <button
                  onClick={() => {
                    if (!ch.comingSoon) {
                      setSelectedChannel(ch.key)
                      setSelectedChat(null)
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2.5 rounded-2xl text-[13px] font-semibold transition-all ${channelsCollapsed ? 'justify-center' : 'justify-between'} ${
                    ch.comingSoon
                      ? "opacity-50 cursor-not-allowed grayscale"
                      : selectedChannel === ch.key
                      ? "bg-[#F3E8FF] text-[#6366F1]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {ch.iconUrl ? <img src={ch.iconUrl} className="w-4 h-4" alt="" title={channelsCollapsed ? ch.label : ""} /> : <MessageSquare className="w-4 h-4 text-slate-400" title={channelsCollapsed ? ch.label : ""} />}
                    {!channelsCollapsed && ch.label}
                  </div>
                  {!channelsCollapsed && ch.comingSoon && (
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">SOON</span>
                  )}
                </button>
              </div>
            ))}
          </div>

          <h2 className={`text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2 transition-opacity ${channelsCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>Filters</h2>
          <div className="space-y-1">
            {[
              { key: "all", label: "All Chats", icon: <MessageSquare className={`w-4 h-4 ${!channelsCollapsed && 'mr-2'} inline`} /> },
              { key: "ai_handling", label: "AI Handling", icon: <Bot className={`w-4 h-4 ${!channelsCollapsed && 'mr-2'} inline text-indigo-500`} /> },
              { key: "human_needed", label: "Needs review", icon: <ClipboardList className={`w-4 h-4 ${!channelsCollapsed && 'mr-2'} inline text-amber-500`} /> },
            ].map((view) => (
              <button
                key={view.key}
                onClick={() => setSelectedFilter(view.key as ChatFilter)}
                className={`w-full text-left px-3 py-2.5 rounded-2xl text-[13px] font-semibold transition-all flex items-center ${channelsCollapsed ? 'justify-center' : ''} ${
                  selectedFilter === view.key
                    ? "bg-[#F3E8FF] text-[#6366F1]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                title={channelsCollapsed ? view.label : ""}
              >
                {view.icon} {!channelsCollapsed && view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedChannel !== "all" && CHANNELS.find(c => c.key === selectedChannel)?.connected === false ? (
        <div className="flex-1 bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center justify-center text-center p-8">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Link2Off className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-[24px] font-bold text-slate-900 mb-3">Connect {CHANNELS.find(c => c.key === selectedChannel)?.label}</h2>
          <p className="text-[15px] text-slate-500 max-w-md mb-8">
            You haven't connected this channel yet. Connect it now to manage all your conversations directly from Torcia.
          </p>
          <button className="px-6 py-3 bg-[#6366F1] text-white rounded-xl text-[14px] font-bold hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-sm">
            <Link2 className="w-5 h-5" />
            Connect {CHANNELS.find(c => c.key === selectedChannel)?.label}
          </button>
        </div>
      ) : (
        <>
          {/* COLUMN 2: Conversation List */}
          <div className={`w-[300px] flex-shrink-0 flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden transition-all duration-300`}>
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-slate-900">Conversations</h2>
            <div className="flex items-center gap-1.5">
              {selectedChannel !== "all" && (
                <button className="p-1.5 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all" title="Unlink Channel">
                  <Link2Off className="w-4 h-4" />
                </button>
              )}
              {showSearch ? (
                <div className="flex items-center bg-slate-50 rounded-full px-2 py-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                  <input 
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="bg-transparent text-[12px] w-24 outline-none placeholder:text-slate-400"
                  />
                  <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-slate-400 hover:text-slate-600 px-1">×</button>
                </div>
              ) : (
                <button onClick={() => setShowSearch(true)} className="p-1.5 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all">
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Quick tab filters inside the list */}
          <div className="flex bg-slate-50 p-1 rounded-xl">
            <button 
              onClick={() => setSelectedFilter("all")}
              className={`flex-1 py-1 text-[12px] font-bold rounded-lg transition-all ${selectedFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >All</button>
            <button 
              onClick={() => setSelectedFilter("ai_handling")}
              className={`flex-1 py-1 text-[12px] font-bold rounded-lg transition-all ${selectedFilter === "ai_handling" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >AI</button>
            <button 
              onClick={() => setSelectedFilter("human_needed")}
              className={`flex-1 py-1 text-[12px] font-bold rounded-lg transition-all ${selectedFilter === "human_needed" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >Needs Attention</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-[13px] font-bold text-slate-900">No chats found</p>
              <p className="text-[11px] text-slate-500 mt-1">Try changing your filters.</p>
            </div>
          )}
          {filteredConversations.map((conv) => {
            const isSelected = selectedChat?.id === conv.id
            const contactName = conv.contact?.name || "Unknown Customer"
            const contactInitial = contactName.substring(0, 2).toUpperCase()
            const isHumanNeeded = conv.status === "escalated"

            return (
              <button
                key={conv.id}
                onClick={() => setSelectedChat(conv)}
                className={`w-full text-left p-3 border-b border-slate-50 transition-all ${
                  isSelected ? "bg-[#F8FAFC]" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold overflow-hidden ${
                      isHumanNeeded ? "bg-rose-100 text-rose-700" : "bg-[#F3E8FF] text-[#6366F1]"
                    }`}>
                      {conv.contact?.avatar_url ? (
                        <img src={conv.contact.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : contactInitial}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                      {getChannelIcon(conv.platform)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-[13px] truncate ${conv.unread_count > 0 ? "text-slate-900 font-bold" : "text-slate-800 font-bold"}`}>
                        {contactName}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {formatNPTTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className={`text-[12px] truncate ${conv.unread_count > 0 ? "text-slate-800 font-semibold" : "text-slate-500"}`}>
                      {conv.last_message_preview || "Started conversation"}
                    </p>
                    {isHumanNeeded && (
                      <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[9px] font-bold rounded-md">
                        ⚠️ Needs Attention
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* COLUMN 3: Chat View & Quick Actions */}
      {selectedChat ? (
        <div className="flex-1 flex gap-4 min-w-0">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden min-w-[300px]">
            {/* Chat Header */}
            <div className="h-16 px-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[14px] font-bold text-[#6366F1] overflow-hidden">
                  {selectedChat.contact?.avatar_url ? (
                    <img src={selectedChat.contact.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (selectedChat.contact?.name?.substring(0, 2).toUpperCase() || "CU")}
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-2">
                    {selectedChat.contact?.name || "Customer"}
                    <span className="flex items-center justify-center bg-slate-100 w-6 h-6 rounded-full">{getChannelIcon(selectedChat.platform)}</span>
                  </h3>
                  <p className="text-[13px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    {formatPhone(selectedChat.contact?.phone)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    const newProfileState = !showProfile;
                    setShowProfile(newProfileState);
                    if (newProfileState && !channelsCollapsed) {
                      setChannelsCollapsed(true);
                    }
                  }}
                  className={`p-2.5 rounded-full transition-all flex items-center justify-center ${showProfile ? 'bg-[#F3E8FF] text-[#6366F1]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  title="Contact Info"
                >
                  <UserIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 flex flex-col-reverse gap-6 bg-[#FAFAFA]">
              <div ref={messagesEndRef} />
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <MessageSquare className="w-12 h-12 mb-4 text-slate-200" />
                  <p className="text-[14px] font-medium">No messages yet.</p>
                </div>
              )}
              {messages.map((msg) => {
                const isCustomer = msg.sender_type === "customer"
                return (
                  <div key={msg.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[60%] ${
                      isCustomer
                        ? "bg-white border border-slate-200 rounded-3xl rounded-tl-sm text-slate-800 shadow-sm"
                        : msg.is_ai_generated
                        ? "bg-gradient-to-br from-[#F3E8FF] to-[#E0E7FF] border border-[#E0E7FF] rounded-3xl rounded-tr-sm text-[#4338CA] shadow-sm"
                        : "bg-[#1E293B] border border-[#1E293B] rounded-3xl rounded-tr-sm text-white shadow-md"
                    } px-5 py-4`}>
                      {!isCustomer && msg.is_ai_generated && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Bot className="w-4 h-4 text-[#6366F1]" />
                          <span className="text-[11px] font-bold text-[#6366F1] uppercase tracking-wider">Torcia AI</span>
                        </div>
                      )}
                      {!isCustomer && !msg.is_ai_generated && (
                        <div className="flex items-center gap-1.5 mb-2 opacity-70">
                          <UserIcon className="w-4 h-4" />
                          <span className="text-[11px] font-bold uppercase tracking-wider">{merchant?.business_name || "Store Owner"}</span>
                        </div>
                      )}
                      {msg.media_url && msg.message_type === 'image' && (
                        <div className="mb-2 overflow-hidden rounded-xl border border-slate-200">
                          <img 
                            src={msg.media_url.startsWith('whatsapp_media:') ? undefined : msg.media_url} 
                            alt="Customer upload" 
                            onClick={() => !msg.media_url.startsWith('whatsapp_media:') && setZoomedImage(msg.media_url)}
                            className="max-w-full max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </div>
                      )}
                      <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap max-w-full">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-2 opacity-60">
                        <span className="text-[11px] font-medium">
                          {formatNPTTime(msg.created_at)}
                        </span>
                        {!isCustomer && <CheckCheck className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 self-end bg-white p-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Assign To:</span>
                {assignedTo !== "ai" ? (
                  <button
                    onClick={async () => {
                      setAssignedTo("ai");
                      setAiPaused(false);
                      if (selectedChat) {
                        await supabase.from('conversations').update({ status: 'ai_handling' }).eq('id', selectedChat.id);
                        fetchInitialData();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shadow-sm"
                  >
                    <Bot className="w-3.5 h-3.5" /> Torcia AI
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        setAssignedTo("owner");
                        setAiPaused(true);
                        if (selectedChat) {
                          await supabase.from('conversations').update({ status: 'escalated' }).eq('id', selectedChat.id);
                          fetchInitialData();
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100 shadow-sm"
                    >
                      <UserIcon className="w-3.5 h-3.5" /> Me
                    </button>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 transition-all bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-sm"
                    >
                      <UserIcon className="w-3.5 h-3.5" /> Others
                    </button>
                  </>
                )}
              </div>
              
              {aiPaused ? (
                <div className="flex items-end gap-3 bg-slate-50 p-2 rounded-[20px] border border-slate-200 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                  <div className="flex gap-1 pl-2 pb-1">
                    <button className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all">
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      adjustTextareaHeight(e.target);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type your manual reply..."
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none py-3 text-[14px] text-slate-900 placeholder:text-slate-400 min-h-[44px]"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="p-3 mb-1 mr-1 rounded-full bg-[#1E293B] hover:bg-slate-800 text-white transition-all disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="py-4 px-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6366F1] flex items-center justify-center text-white">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-indigo-900">Torcia AI is currently responding to this customer.</p>
                      <p className="text-[12px] text-indigo-700">Toggle "AI Handling" above to take over manually.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className={`w-[280px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto scrollbar-none pb-4 transition-all duration-300 ${showProfile ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 hidden'}`}>
            <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[24px] font-bold text-[#6366F1] mb-4 overflow-hidden shadow-sm">
                {selectedChat.contact?.avatar_url ? (
                  <img src={selectedChat.contact.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (selectedChat.contact?.name?.substring(0, 2).toUpperCase() || "CU")}
              </div>
              <h3 className="text-[16px] font-bold text-slate-900">{selectedChat.contact?.name || "Customer"}</h3>
              <p className="text-[14px] font-medium text-slate-500 mt-1">{formatPhone(selectedChat.contact?.phone)}</p>
              {selectedChat.contact?.address && (
                <p className="text-[12px] font-medium text-slate-600 mt-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-sm w-full justify-center text-center">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedChat.contact.address}</span>
                </p>
              )}
              
              <div className="w-full flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source</p>
                <div className="flex items-center gap-1.5">
                  {getChannelIcon(selectedChat.platform)}
                  <span className="text-[13px] font-medium text-slate-900 capitalize">{selectedChat.platform}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-slate-900">Tickets</h3>
                <button onClick={() => {
                  const recentOrder = customerOrders.length > 0 ? customerOrders[0].id : "";
                  setTicketInput({ title: "", description: "", priority: "medium", order_id: recentOrder });
                  setShowTicketModal(true);
                }} className="p-1 text-[#6366F1] bg-[#F3E8FF] rounded-lg hover:bg-indigo-100 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {customerTickets.length === 0 ? (
                  <p className="text-[12px] text-slate-500 text-center py-2">No tickets found.</p>
                ) : (
                  customerTickets.slice(0, 3).map(ticket => (
                    <div key={ticket.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold text-slate-500">#{ticket.id.substring(0,8).toUpperCase()}</span>
                        <span className="text-[10px] text-slate-400">{formatNPTTime(ticket.created_at)}</span>
                      </div>
                      <p className="text-[12px] font-bold text-slate-900 truncate mb-1.5">{ticket.title}</p>
                      <div className="flex items-center">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ticket.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {ticket.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                {customerTickets.length > 3 && (
                  <button className="w-full text-center text-[11px] font-bold text-[#6366F1] pt-2">View All Tickets</button>
                )}
              </div>
            </div>

            {/* Orders Section */}
            <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-[14px] font-bold text-slate-900 mb-4">Orders</h3>
              <div className="space-y-2">
                {customerOrders.length === 0 ? (
                  <p className="text-[12px] text-slate-500 text-center py-2">No orders found.</p>
                ) : (
                  customerOrders.slice(0, 3).map(order => (
                    <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-[12px] font-bold text-slate-900 truncate">Order #{order.id.substring(0,8)}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between items-end mt-1.5">
                        {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                          <p className="text-[11px] font-medium text-slate-700 truncate max-w-[120px]">
                            {order.items.map((i: any) => i.name).join(', ')}
                          </p>
                        ) : (
                          <p className="text-[11px] font-medium text-slate-400">No items</p>
                        )}
                        <p className="text-[11px] font-bold text-slate-900">Rs. {Number(order.amount).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <h3 className="text-[14px] font-bold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => setShowQRModal(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#6366F1] hover:bg-[#F3E8FF] transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:text-[#6366F1]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700 group-hover:text-[#6366F1]">Generate & Send QR</span>
                </button>
                
                <button 
                  onClick={() => {
                    setMessageInput("Could you please provide your full delivery address and contact number?")
                    if (!aiPaused) toggleAIPaused()
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#6366F1] hover:bg-[#F3E8FF] transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:text-[#6366F1]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700 group-hover:text-[#6366F1]">Ask Delivery Details</span>
                </button>

                <button 
                  onClick={() => setShowProductModal(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#6366F1] hover:bg-[#F3E8FF] transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:text-[#6366F1]">
                    <Box className="w-5 h-5" />
                  </div>
                  <span className="text-[13px] font-bold text-slate-700 group-hover:text-[#6366F1]">Recommend Product</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <MessageSquare className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-[20px] font-bold text-slate-900 mb-2">Omnichannel Inbox</h2>
          <p className="text-[14px] text-slate-500 max-w-sm">
            Select a conversation from the list to start messaging or review AI interactions.
          </p>
        </div>
      )}
      {/* Product Recommendation Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowProductModal(false)}>
          <div className="w-[600px] max-h-[80vh] flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-[18px] font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-[#6366F1]" /> Recommend Product
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <span className="font-bold text-lg leading-none">×</span>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchProductQuery} 
                  onChange={e => setSearchProductQuery(e.target.value)} 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#6366F1]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {products.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-slate-500">No products available in your catalog.</div>
                )}
                {products.filter(p => p.name.toLowerCase().includes(searchProductQuery.toLowerCase())).map(p => (
                  <div key={p.id} className={`p-3 border rounded-2xl cursor-pointer transition-all flex gap-3 items-center group ${selectedProduct?.id === p.id ? 'border-[#6366F1] bg-indigo-50 shadow-sm' : 'border-slate-100 hover:border-[#6366F1] hover:shadow-sm'}`}
                    onClick={() => setSelectedProduct(p)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden relative">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 truncate group-hover:text-[#6366F1]">{p.name}</p>
                      <p className="text-[12px] font-bold text-emerald-600 mt-0.5">Rs. {Number(p.price).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => { setShowProductModal(false); setSelectedProduct(null) }} className="px-4 py-2 text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">Cancel</button>
              <button 
                disabled={!selectedProduct}
                onClick={() => {
                  const msg = `I recommend the ${selectedProduct.name}! It's available for Rs. ${Number(selectedProduct.price).toLocaleString()}. Let me know if you'd like to order it.\n\n[PRODUCT_IMAGE:${selectedProduct.image_url || ''}]`
                  setMessageInput(msg)
                  setShowProductModal(false)
                  setSelectedProduct(null)
                  if (!aiPaused) toggleAIPaused()
                }}
                className="px-4 py-2 text-[13px] font-bold text-white bg-[#6366F1] hover:bg-indigo-600 rounded-xl disabled:opacity-50"
              >Send Recommendation</button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAssignModal(false)}>
          <div className="w-[400px] max-h-[80vh] flex flex-col bg-white rounded-[24px] shadow-2xl border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-[18px] font-bold text-slate-900 flex items-center gap-2">
                Assign Chat
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <span className="font-bold text-lg leading-none">×</span>
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {teamMembers.length === 0 ? (
                <p className="text-[13px] text-slate-500 text-center py-4">No other team members found in the store.</p>
              ) : (
                teamMembers.map(tm => (
                  <button
                    key={tm.id}
                    onClick={async () => {
                      setAssignedTo(tm.id);
                      setAiPaused(true);
                      setShowAssignModal(false);
                      if (selectedChat) {
                        await supabase.from('conversations').update({ status: 'escalated' }).eq('id', selectedChat.id);
                        fetchInitialData();
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left"
                  >
                    <span className="text-[13px] font-bold text-slate-900">{tm.name}</span>
                    {assignedTo === tm.id && <CheckCheck className="w-4 h-4 text-indigo-600" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowTicketModal(false)}>
          <div className="w-[400px] bg-white rounded-[24px] shadow-2xl border border-slate-100 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[18px] font-bold text-slate-900 mb-4">Create Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Ticket Title</label>
                <input 
                  type="text" 
                  value={ticketInput.title}
                  onChange={e => setTicketInput({...ticketInput, title: e.target.value})}
                  placeholder="e.g. Missing Delivery"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#6366F1] outline-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea 
                  value={ticketInput.description}
                  onChange={e => setTicketInput({...ticketInput, description: e.target.value})}
                  placeholder="Details about the issue..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#6366F1] outline-none resize-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Priority</label>
                  <select
                    value={ticketInput.priority}
                    onChange={e => setTicketInput({...ticketInput, priority: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#6366F1] outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                {customerOrders.length > 0 && (
                  <div className="flex-1">
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Linked Order</label>
                    <select
                      value={ticketInput.order_id}
                      onChange={e => setTicketInput({...ticketInput, order_id: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:ring-2 focus:ring-[#6366F1] outline-none truncate"
                    >
                      <option value="">No Link</option>
                      {customerOrders.map(o => (
                        <option key={o.id} value={o.id}>
                          #{o.id.substring(0,8)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowTicketModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >Cancel</button>
                <button 
                  onClick={handleCreateTicket}
                  disabled={!ticketInput.title}
                  className="flex-1 py-2.5 text-[13px] font-bold text-white bg-[#6366F1] hover:bg-indigo-600 rounded-xl transition-all disabled:opacity-50"
                >Create Ticket</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual QR Modal */}
      {showQRModal && selectedChat && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[18px] font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#6366F1]" /> Generate Payment QR
              </h3>
              <button 
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Product or Custom Heading</label>
                <input
                  type="text"
                  value={qrRemarks}
                  onChange={(e) => {
                    setQrRemarks(e.target.value)
                    setShowQrProductSuggestions(true)
                  }}
                  onFocus={() => setShowQrProductSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowQrProductSuggestions(false), 200)}
                  placeholder="Search products or type manual heading..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#6366F1] transition-all"
                />
                {showQrProductSuggestions && products.filter(p => p.name.toLowerCase().includes(qrRemarks.toLowerCase())).length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {products.filter(p => p.name.toLowerCase().includes(qrRemarks.toLowerCase())).map(p => (
                      <button
                        key={p.id}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setQrRemarks(p.name)
                          setQrAmount(p.price.toString())
                          setShowQrProductSuggestions(false)
                        }}
                      >
                        <span className="text-[13px] font-bold text-slate-900">{p.name}</span>
                        <span className="text-[12px] font-bold text-emerald-600">Rs. {p.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Amount (Rs.)</label>
                <input
                  type="number"
                  value={qrAmount}
                  onChange={(e) => setQrAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#6366F1] transition-all"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowQRModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-[14px] text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isSendingQR || !qrAmount.trim()}
                onClick={async () => {
                  setIsSendingQR(true)
                  try {
                    const res = await fetch("/api/messages/send-qr", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        conversation_id: selectedChat.id,
                        amount: qrAmount,
                        remarks: qrRemarks
                      })
                    })
                    const data = await res.json()
                    if (data.error) {
                      alert("Error generating QR: " + data.error)
                    } else {
                      if (!aiPaused) toggleAIPaused()
                      setShowQRModal(false)
                      setQrAmount("")
                      setQrRemarks("")
                    }
                  } catch (err) {
                    alert("Network error sending QR")
                  }
                  setIsSendingQR(false)
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-[14px] text-white bg-[#6366F1] hover:bg-indigo-600 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
              >
                {isSendingQR ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Send QR</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button 
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-10"
          >
            <X className="w-8 h-8 md:w-10 md:h-10" />
          </button>
          
          <div 
            className="relative flex items-center justify-center animate-in zoom-in-95 duration-200 w-full h-full p-2 md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <img 
              src={zoomedImage} 
              alt="Zoomed image" 
              className="max-w-full max-h-full object-contain drop-shadow-2xl select-none rounded-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
