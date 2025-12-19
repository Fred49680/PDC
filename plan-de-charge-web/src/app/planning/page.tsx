'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from '@/components/Common/Loading'

// Redirection automatique vers Planning2
export default function PlanningPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/planning2')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Loading message="Redirection vers Planning 2.0..." />
    </div>
  )
}
