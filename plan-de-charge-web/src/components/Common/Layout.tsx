'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, Users, Calendar, LayoutDashboard, Home, Building2, 
  MapPin, Target, AlertCircle, Menu, X, Sparkles 
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Accueil', icon: Home, color: 'from-blue-500 to-indigo-600' },
    { href: '/affaires', label: 'Affaires', icon: Building2, color: 'from-indigo-500 to-purple-600' },
    { href: '/ressources', label: 'Ressources', icon: Users, color: 'from-green-500 to-emerald-600' },
    { href: '/planning2', label: 'Planning', icon: Sparkles, color: 'from-indigo-500 to-purple-600' },
    { href: '/absences', label: 'Absences', icon: Calendar, color: 'from-purple-500 to-indigo-600' },
    { href: '/alertes', label: 'Alertes', icon: AlertCircle, color: 'from-orange-500 to-amber-600' },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-orange-500 to-amber-600' },
    { href: '/admin/sites', label: 'Sites', icon: MapPin, color: 'from-blue-500 to-cyan-600' },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Navigation moderne avec glassmorphism */}
      <nav className="bg-white/90 backdrop-blur-xl shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Plan de Charge
                </div>
                <div className="text-xs text-gray-500 font-medium">Gestion des ressources</div>
              </div>
            </Link>

            {/* Navigation desktop */}
            <div className="hidden lg:flex items-center space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                      flex items-center gap-2 group
                      ${
                        active
                          ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-105`
                          : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span>{item.label}</span>
                    {active && (
                      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-md" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Menu mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Menu mobile déroulant */}
          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 space-y-2 animate-fade-in">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                      ${
                        active
                          ? `bg-gradient-to-r ${item.color} text-white shadow-md`
                          : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Contenu principal avec padding amélioré */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer moderne */}
      <footer className="mt-20 border-t border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 font-medium">
              © 2025 Plan de Charge - Application de gestion des ressources
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Système opérationnel</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
