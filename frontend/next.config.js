/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // In dev: set NEXT_PUBLIC_API_URL=http://localhost:8000 in .env.local
  // In prod: NEXT_PUBLIC_API_URL="" (same origin — FastAPI serves everything)
}

module.exports = nextConfig
