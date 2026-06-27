/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['gentleman-custard-observant.ngrok-free.dev', 'localhost:3000', 'localhost', '*'],
}

export default nextConfig
