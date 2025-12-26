'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/Common/Layout'
import { Loading } from '@/components/Common/Loading'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger automatiquement vers le dashboard
    router.push('/dashboard')
  }, [router])

  return (
    <Layout>
      <Loading message="Redirection vers le dashboard..." />
    </Layout>
  )
}
