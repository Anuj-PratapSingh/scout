import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Scout — Opportunity Radar',
  description: 'Scout monitors the internet for hackathons, internships, bounties and more — and notifies you the moment something matches your criteria.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..800;1,6..72,300..800&family=Space+Grotesk:wght@300..700&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
