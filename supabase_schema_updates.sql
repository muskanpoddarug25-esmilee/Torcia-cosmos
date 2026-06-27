-- Phase 2.6: Broadcast campaigns and recipients tables
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft', 'pending_approval', 'approved', 'sending', 'sent', 'rejected'])),
  meta_template_id TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  converted_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'sent', 'delivered', 'read', 'failed'])),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_merchant ON public.broadcast_campaigns(merchant_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_campaign ON public.broadcast_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON public.broadcast_recipients(campaign_id, status);

ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Phase 2.7: Usage tracking table (Billing & Rate Limiting)
CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  metric TEXT NOT NULL,                -- 'ai_message', 'qr_generated', 'vision_analysis'
  count INTEGER DEFAULT 1,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_merchant_period ON public.usage_records(merchant_id, period_start, metric);

ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- Add rate limiting columns to merchants
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS qr_generated_used INTEGER DEFAULT 0;
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS vision_ai_used INTEGER DEFAULT 0;

-- Phase 2.8: Background jobs tracking
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,              -- 'payment_verify', 'abandoned_cart', 'gift_dispatch'
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending', 'processing', 'completed', 'failed'])),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 20,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_next_run ON public.background_jobs(status, next_run_at);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Phase 2.12: Add esewa and khalti to payment_credentials
ALTER TABLE public.payment_credentials DROP CONSTRAINT IF EXISTS payment_credentials_provider_check;
ALTER TABLE public.payment_credentials ADD CONSTRAINT payment_credentials_provider_check CHECK (provider = ANY (ARRAY['nepalpay'::text, 'fonepay'::text, 'esewa'::text, 'khalti'::text]));

-- Phase 2.13: RLS Policies
-- First, drop the insecure anon policies
DROP POLICY IF EXISTS "Allow anon read all" ON public.ai_conversations;
DROP POLICY IF EXISTS "Allow anon read all" ON public.contacts;
DROP POLICY IF EXISTS "Allow anon read all" ON public.conversations;
DROP POLICY IF EXISTS "Allow anon read all" ON public.integrations;
DROP POLICY IF EXISTS "Allow anon read all" ON public.merchant_settings;
DROP POLICY IF EXISTS "Allow anon read all" ON public.merchant_users;
DROP POLICY IF EXISTS "Allow anon read all" ON public.merchants;
DROP POLICY IF EXISTS "Allow anon read all" ON public.messages;
DROP POLICY IF EXISTS "Allow anon read all" ON public.orders;
DROP POLICY IF EXISTS "Allow anon read all" ON public.payment_credentials;
DROP POLICY IF EXISTS "Allow anon read all" ON public.products;
DROP POLICY IF EXISTS "team_members_all" ON public.team_members; -- dropping wide open policy
DROP POLICY IF EXISTS "anyone_can_read_tiers" ON public.subscription_tiers;

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user belongs to merchant (either as owner or team member)
CREATE OR REPLACE FUNCTION auth.is_merchant_member(merchant_id uuid) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.merchants m WHERE m.id = $1 AND m.user_id = auth.uid()
    UNION
    SELECT 1 FROM public.team_members tm WHERE tm.merchant_id = $1 AND (tm.user_id = auth.uid() OR tm.email = auth.email()) AND tm.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate secure policies using the helper function
CREATE POLICY "tenant_isolation_ai_conversations" ON public.ai_conversations FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_contacts" ON public.contacts FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_conversations" ON public.conversations FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_integrations" ON public.integrations FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_merchant_settings" ON public.merchant_settings FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_messages" ON public.messages FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_orders" ON public.orders FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_payment_credentials" ON public.payment_credentials FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_products" ON public.products FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_team_members" ON public.team_members FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_tickets" ON public.tickets FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_webhook_events" ON public.webhook_events FOR ALL USING (false); -- Only service role accesses this
CREATE POLICY "tenant_isolation_gift_codes" ON public.gift_codes FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_invoices" ON public.invoices FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_broadcast_campaigns" ON public.broadcast_campaigns FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_broadcast_recipients" ON public.broadcast_recipients FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_usage_records" ON public.usage_records FOR ALL USING (auth.is_merchant_member(merchant_id));
CREATE POLICY "tenant_isolation_background_jobs" ON public.background_jobs FOR ALL USING (false); -- Only service role accesses this
