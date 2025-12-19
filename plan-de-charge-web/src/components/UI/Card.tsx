'use client'

import { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

export function Card({ children, className, hover = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6',
        hover && 'hover:shadow-2xl transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  icon?: ReactNode
  gradient?: 'indigo' | 'green' | 'purple' | 'orange' | 'blue'
}

export function CardHeader({ children, icon, gradient = 'indigo', className, ...props }: CardHeaderProps) {
  const gradients = {
    indigo: 'from-indigo-500 to-purple-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-indigo-600',
    orange: 'from-orange-500 to-amber-600',
    blue: 'from-blue-500 to-indigo-600'
  }
  
  return (
    <div className={cn('flex items-center gap-3 mb-6', className)} {...props}>
      <div className={cn('w-1 h-8 bg-gradient-to-b rounded-full', `bg-gradient-to-b ${gradients[gradient]}`)}></div>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </div>
  )
}
