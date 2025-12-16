'use client'

import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
}

export function Loading({ message = 'Chargement...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
      <p className="text-gray-500">{message}</p>
    </div>
  )
}
