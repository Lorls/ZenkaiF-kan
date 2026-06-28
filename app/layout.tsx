import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fūkan — Institut du Sceau',
  description: 'Gestion des membres de l\'Institut du Sceau',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
