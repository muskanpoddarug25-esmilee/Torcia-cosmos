"use client"

import { useState, useEffect, useRef } from "react"
import { Package, Plus, Search, Loader2, Trash2, Edit3, ImageIcon, X, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useMerchant } from "@/lib/merchant-context"

function generateProductTag(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000))
}

export default function ProductsPage() {
  const supabase = createClient()
  const { merchant } = useMerchant()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    in_stock: true,
    has_variants: false,
    variants: [] as any[],
  })

  useEffect(() => {
    fetchProducts()
  }, [merchant])

  const fetchProducts = async () => {
    if (!merchant) return
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })

    setProducts(data || [])
    setLoading(false)
  }

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageSelect(file)
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()
    const fileName = `${merchant.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("product-images").upload(fileName, file)
    if (error) {
      console.error("Upload error:", error)
      return null
    }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName)
    return publicUrl
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({ name: "", category: "", price: "", description: "", in_stock: true, has_variants: false, variants: [] })
    setImageFile(null)
    setImagePreview(null)
    setShowModal(true)
  }

  const openEditModal = (product: any) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category || "",
      price: String(product.price),
      description: product.description || "",
      in_stock: product.in_stock,
      has_variants: product.has_variants || false,
      variants: product.variants || [],
    })
    setImagePreview(product.image_url || null)
    setImageFile(null)
    setShowModal(true)
  }

  const handleSaveProduct = async () => {
    if (!formData.name || !formData.price || !merchant) return
    setSaving(true)

    let imageUrl = editingProduct?.image_url || null
    if (imageFile) {
      imageUrl = await uploadImage(imageFile)
    }

    if (editingProduct) {
      await supabase
        .from("products")
        .update({
          name: formData.name,
          category: formData.category,
          price: Number(formData.price),
          description: formData.description,
          in_stock: formData.in_stock,
          has_variants: formData.has_variants,
          variants: formData.has_variants ? formData.variants : [],
          image_url: imageUrl,
        })
        .eq("id", editingProduct.id)
    } else {
      const tag = generateProductTag()
      await supabase.from("products").insert({
        merchant_id: merchant.id,
        item_code: tag,
        product_tag: tag,
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
        description: formData.description,
        in_stock: formData.in_stock,
        has_variants: formData.has_variants,
        variants: formData.has_variants ? formData.variants : [],
        image_url: imageUrl,
      })
    }

    setShowModal(false)
    setFormData({ name: "", category: "", price: "", description: "", in_stock: true, has_variants: false, variants: [] })
    setImageFile(null)
    setImagePreview(null)
    setEditingProduct(null)
    fetchProducts()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from("products").delete().eq("id", id)
    fetchProducts()
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="max-w-6xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Products</h1>
            <p className="text-[15px] text-slate-500 mt-1">{products.length} products in catalog</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-6 py-3 rounded-[16px] bg-[#6366F1] text-white text-[14px] font-bold hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          {products.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-[#F3E8FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-[#6366F1]" />
              </div>
              <h3 className="text-[16px] font-bold text-slate-900">No products yet</h3>
              <p className="text-[14px] text-slate-500 mt-1 max-w-sm mx-auto">
                Add your first product so the AI can answer customer questions about pricing and availability.
              </p>
              <button onClick={openAddModal} className="mt-6 px-6 py-3 rounded-[16px] bg-[#6366F1] text-white text-[14px] font-bold hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
                <Plus className="w-4 h-4 inline mr-1" /> Add Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Product</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tag</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Price</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock</th>
                    <th className="py-4 px-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-slate-900">{p.name}</p>
                            <p className="text-[12px] text-slate-500 font-medium">{p.category || "Uncategorized"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono font-bold">
                          #{p.product_tag || p.item_code}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[14px] font-bold text-slate-900">Rs. {Number(p.price).toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          p.in_stock ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {p.in_stock ? "In Stock" : "Out of Stock"}
                        </span>
                        {p.has_variants && (
                          <span className="block mt-1 text-[10px] text-slate-400 font-bold">{p.variants?.length} variants</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(p)} className="p-2 text-slate-400 hover:text-[#6366F1] hover:bg-[#F3E8FF] rounded-xl transition-all">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-[560px] max-h-[85vh] flex flex-col bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#6366F1]" />
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                <span className="font-bold text-lg leading-none">×</span>
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Image Upload */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-2">Product Image</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    dragOver ? "border-indigo-400 bg-indigo-50" : imagePreview ? "border-gray-200 bg-gray-50" : "border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30"
                  }`}
                >
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null) }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-[13px] text-gray-600 font-medium">Drop image here or click to browse</p>
                      <p className="text-[11px] text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelect(file)
                    }}
                  />
                </div>
              </div>

              {/* Name & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Product Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Black Cotton T-Shirt"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Price (NPR)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Men's Wear"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Description (AI will read this)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Include details like sizes, colors, material..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none transition-all"
                />
              </div>

              {/* In Stock */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, in_stock: !formData.in_stock })}
                    className={`relative w-11 h-6 rounded-full transition-all ${formData.in_stock ? "bg-emerald-500" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${formData.in_stock ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                  <span className="text-[13px] font-medium text-gray-700">Currently in stock</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-gray-700">Has Variants?</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ 
                      ...formData, 
                      has_variants: !formData.has_variants,
                      variants: !formData.has_variants && (!formData.variants || formData.variants.length === 0) ? [{ size: '', color: '', stock: 0, sku: '' }] : (formData.variants || [])
                    })}
                    className={`relative w-11 h-6 rounded-full transition-all ${formData.has_variants ? "bg-indigo-500" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${formData.has_variants ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Variants Section */}
              {formData.has_variants && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-bold text-indigo-900">Product Variants</h4>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, variants: [...(formData.variants || []), { size: '', color: '', stock: 0, sku: '' }]})}
                      className="text-[12px] font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      + Add Variant
                    </button>
                  </div>
                  
                  {(formData.variants || []).map((v: any, i: number) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input 
                        type="text" placeholder="Size (e.g. M)" value={v.size || ''}
                        onChange={(e) => {
                          const newV = [...(formData.variants || [])]; newV[i].size = e.target.value; setFormData({...formData, variants: newV})
                        }}
                        className="w-1/4 px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px]"
                      />
                      <input 
                        type="text" placeholder="Color (e.g. Red)" value={v.color || ''}
                        onChange={(e) => {
                          const newV = [...(formData.variants || [])]; newV[i].color = e.target.value; setFormData({...formData, variants: newV})
                        }}
                        className="w-1/4 px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px]"
                      />
                      <input 
                        type="text" placeholder="SKU" value={v.sku || ''}
                        onChange={(e) => {
                          const newV = [...(formData.variants || [])]; newV[i].sku = e.target.value; setFormData({...formData, variants: newV})
                        }}
                        className="w-1/4 px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px]"
                      />
                      <input 
                        type="number" placeholder="Stock" value={v.stock || 0}
                        onChange={(e) => {
                          const newV = [...(formData.variants || [])]; newV[i].stock = parseInt(e.target.value) || 0; setFormData({...formData, variants: newV})
                        }}
                        className="w-1/5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px]"
                      />
                      <button onClick={() => {
                        const newV = (formData.variants || []).filter((_, idx) => idx !== i);
                        setFormData({...formData, variants: newV})
                      }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-tag info */}
              {!editingProduct && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[11px] text-indigo-600 font-medium">
                    💡 A unique 7-digit product tag will be auto-generated for this product
                  </span>
                </div>
              )}

              {/* Save */}
              <button
                onClick={handleSaveProduct}
                disabled={saving || !formData.name || !formData.price}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px] disabled:opacity-50 transition-all flex justify-center shadow-lg shadow-indigo-500/25"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : editingProduct ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
