import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gaiko — Diplomatie',
  description: 'Gestion des membres de la section Diplomatie',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
