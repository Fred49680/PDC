'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function TestSupabasePage() {
  const [status, setStatus] = useState<{
    loading: boolean
    success: boolean
    message: string
    details?: any
  }>({
    loading: true,
    success: false,
    message: 'Test en cours...'
  })

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Vérifier que les variables d'environnement sont définies
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!url || !key) {
          setStatus({
            loading: false,
            success: false,
            message: '❌ Variables d\'environnement manquantes',
            details: {
              url: url ? '✅ Définie' : '❌ Manquante',
              key: key ? '✅ Définie (masquée)' : '❌ Manquante',
              note: 'Redémarrez le serveur avec "npm run dev" après avoir créé/modifié .env.local'
            }
          })
          return
        }

        // Créer le client Supabase
        const supabase = createClient()

        // Test 1 : Connexion de base
        const { data: testData, error: testError } = await supabase
          .from('sites')
          .select('count')
          .limit(1)

        if (testError) {
          // Si la table n'existe pas, c'est normal (schéma pas encore exécuté)
          if (testError.code === 'PGRST116' || testError.message.includes('does not exist')) {
            setStatus({
              loading: false,
              success: true,
              message: '✅ Connexion Supabase OK (table "sites" pas encore créée)',
              details: {
                url: url,
                error: 'Table "sites" introuvable - Exécutez le schéma SQL dans Supabase Dashboard'
              }
            })
          } else {
            setStatus({
              loading: false,
              success: false,
              message: '❌ Erreur de connexion',
              details: {
                code: testError.code,
                message: testError.message,
                hint: testError.hint
              }
            })
          }
          return
        }

        // Test 2 : Lecture d'une table (si elle existe)
        const { data: sites, error: sitesError } = await supabase
          .from('sites')
          .select('*')
          .limit(5)

        if (sitesError) {
          setStatus({
            loading: false,
            success: false,
            message: '❌ Erreur lors de la lecture',
            details: {
              code: sitesError.code,
              message: sitesError.message
            }
          })
          return
        }

        // Succès !
        setStatus({
          loading: false,
          success: true,
          message: '✅ Connexion Supabase réussie !',
          details: {
            url: url,
            tablesFound: sites ? `${sites.length} site(s) trouvé(s)` : 'Table vide',
            data: sites
          }
        })

      } catch (err: any) {
        setStatus({
          loading: false,
          success: false,
          message: '❌ Erreur inattendue',
          details: {
            error: err.message,
            stack: err.stack
          }
        })
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          🧪 Test Connexion Supabase
        </h1>

        <div className="space-y-4">
          {/* Statut */}
          <div className={`p-4 rounded-lg border-2 ${
            status.loading 
              ? 'border-blue-200 bg-blue-50' 
              : status.success 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-center gap-3">
              {status.loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              ) : status.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <p className={`font-semibold ${
                status.loading 
                  ? 'text-blue-800' 
                  : status.success 
                    ? 'text-green-800' 
                    : 'text-red-800'
              }`}>
                {status.message}
              </p>
            </div>
          </div>

          {/* Détails */}
          {status.details && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="font-semibold mb-2">Détails :</h2>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(status.details, null, 2)}
              </pre>
            </div>
          )}

          {/* Instructions */}
          {!status.success && !status.loading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">
                🔧 Actions à effectuer :
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                <li>Vérifier que le fichier <code>.env.local</code> existe</li>
                <li>Vérifier que les variables <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sont définies</li>
                <li>Redémarrer le serveur de développement (<code>npm run dev</code>)</li>
                <li>Exécuter le schéma SQL dans Supabase Dashboard (voir <code>ARCHITECTURE_VERCEL_SUPABASE.md</code>)</li>
              </ol>
            </div>
          )}

          {status.success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                ✅ Prochaines étapes :
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-green-700">
                <li>Exécuter le schéma SQL complet dans Supabase Dashboard</li>
                <li>Créer les composants Charge et Affectation</li>
                <li>Tester les fonctionnalités</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
