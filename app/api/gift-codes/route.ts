import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { encrypt } from '@/lib/crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { productId, codes } = await request.json()
    
    if (!productId || !codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

    // Get merchant
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, store_category')
      .eq('user_id', user.id)
      .limit(1)

    const merchant = merchants?.[0]

    if (!merchant || merchant.store_category !== 'digital') {
      return NextResponse.json({ success: false, message: 'Only digital stores can add gift codes' }, { status: 403 })
    }

    // Encrypt all codes
    const inserts = codes.map(code => {
      const { encryptedData, iv } = encrypt(code.trim());
      // we'll store it as 'iv:encryptedData'
      const storedString = `${iv}:${encryptedData}`;
      return {
        merchant_id: merchant.id,
        product_id: productId,
        encrypted_code: storedString,
        status: 'available'
      }
    });

    // Insert into DB using admin client to bypass RLS if necessary, but actually we can just insert with admin
    const { error } = await supabaseAdmin.from('gift_codes').insert(inserts);

    if (error) throw error;

    return NextResponse.json({ success: true, count: codes.length })
  } catch (err: any) {
    console.error('Add gift codes error:', err)
    return NextResponse.json({ success: false, message: err.message }, { status: 500 })
  }
}
