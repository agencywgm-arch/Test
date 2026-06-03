import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'InstaScrap — Prospection Instagram',
  description: 'Outil SaaS de prospection Instagram : scraping de comptes, campagnes DM automatisées, suivi en temps réel.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={dmSans.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
