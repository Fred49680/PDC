import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ToastProvider } from "@/components/UI/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plan de Charge - Gestion des Ressources",
  description: "Application web moderne pour la gestion des ressources, des affectations et du planning",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plan de Charge",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Plan de Charge" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    console.log('[PWA] Service Worker enregistré:', registration.scope);
                  })
                  .catch((error) => {
                    console.error('[PWA] Erreur enregistrement Service Worker:', error);
                  });
              });
            }
            
            // Vérifier l'accessibilité du manifest.json (optionnel, non bloquant)
            if (typeof window !== 'undefined') {
              fetch('/manifest.json', { method: 'HEAD' })
                .then((response) => {
                  if (!response.ok) {
                    console.warn('[PWA] Manifest.json non accessible (code:', response.status, ') - Non bloquant');
                  }
                })
                .catch((error) => {
                  // Ignorer silencieusement les erreurs de manifest (non critique)
                  console.debug('[PWA] Manifest.json non accessible - Non bloquant:', error.message);
                });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
