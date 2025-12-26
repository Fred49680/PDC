'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers le dashboard au démarrage
    router.push('/dashboard')
  }, [router])

  // Affichage minimal pendant la redirection
  return null
}
