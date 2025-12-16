'use client'

import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
}

export function Loading({ message = 'Chargement...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-20 animate-pulse"></div>
        <Loader2 className="w-16 h-16 animate-spin text-blue-600 absolute top-0 left-0" />
      </div>
      <p className="text-gray-600 font-medium mt-4 text-lg">{message}</p>
      <div className="mt-2 w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
      </div>
    </div>
  )
}
