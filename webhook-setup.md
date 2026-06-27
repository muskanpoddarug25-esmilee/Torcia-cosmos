# Webhook & Ngrok Setup Guide

Torcia AI relies on webhooks to receive real-time messages from WhatsApp, Instagram, and Messenger, as well as payment callbacks.

## 1. Local Development (Ngrok)

When developing locally, your server runs on `localhost:3000`. External services like Meta cannot send webhooks to localhost. We use Ngrok to create a public tunnel.

1. Install Ngrok: `npm install -g ngrok` (or download from ngrok.com)
2. Start the tunnel:
   ```bash
   ngrok http 3000 --domain=gentleman-custard-observant.ngrok-free.dev
   ```
   *(Note: Using a static domain prevents you from having to update Meta Developer console every time you restart Ngrok)*

3. Verify: Your local app is now accessible at `https://gentleman-custard-observant.ngrok-free.dev`

## 2. Meta App Configuration

1. Go to **Meta Developer Dashboard** -> Your App -> WhatsApp -> Configuration
2. Edit the **Callback URL** to point to your ngrok URL:
   `https://gentleman-custard-observant.ngrok-free.dev/api/webhook/whatsapp`
3. Enter the **Verify Token**: `katalio_secret_token_123` (This must match `NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN` in `.env.local`)
4. Manage Webhook Fields: Subscribe to `messages`.

## 3. Production Deployment

Once deployed to Railway or another VPS:
1. Copy the production domain (e.g. `https://torcia-ai.up.railway.app`)
2. Go back to Meta Developer Dashboard and update the Callback URL:
   `https://torcia-ai.up.railway.app/api/webhook/whatsapp`
3. Ensure the production environment has the same `NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN` set.
