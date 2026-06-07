import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'Sentinel-Med — Human-in-the-Loop Medical AI',
  description:
    'A medical chatbot where every answer passes a safety gate and a clinician, and every decision is sealed in a tamper-evident hash chain.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-slate-50 text-slate-900 min-h-screen antialiased">{children}</body>
    </html>
  )
}
