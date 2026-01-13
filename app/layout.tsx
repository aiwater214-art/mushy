import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Gem Generator Dashboard",
  description: "Beautiful account generation dashboard with liquid animations and honey-like transitions",
  generator: "v0.app",
  applicationName: "Gem Generator",
  keywords: ["dashboard", "generator", "gems", "accounts"],
  authors: [{ name: "v0" }],
  openGraph: {
    title: "Gem Generator Dashboard",
    description: "Beautiful account generation dashboard with liquid animations",
    type: "website",
    siteName: "Gem Generator",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gem Generator Dashboard",
    description: "Beautiful account generation dashboard with liquid animations",
  },
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffc8dd" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c12" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
