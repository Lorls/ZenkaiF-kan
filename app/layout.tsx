import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Koeki — Section Économique de Sunagakure',
  description: 'Gestion des ressources et taxes des ninjas de Sunagakure',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
