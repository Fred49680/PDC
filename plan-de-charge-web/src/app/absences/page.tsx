'use client'

import { useState } from 'react'
import { Layout } from '@/components/Common/Layout'
import { useAbsences } from '@/hooks/useAbsences'
import { Loading } from '@/components/Common/Loading'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Forcer le rendu dynamique pour éviter le pré-rendu statique
export const dynamic = 'force-dynamic'

export default function AbsencesPage() {
  const [ressourceId, setRessourceId] = useState('')
  const [site, setSite] = useState('')
  const { absences, loading, error, saveAbsence, deleteAbsence } = useAbsences({
    ressourceId,
    site,
  })

  const [formData, setFormData] = useState({
    ressource_id: '',
    site: '',
    date_debut: format(new Date(), 'yyyy-MM-dd'),
    date_fin: format(new Date(), 'yyyy-MM-dd'),
    type: 'Congés payés',
    competence: '',
    commentaire: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await saveAbsence({
        ...formData,
        date_debut: new Date(formData.date_debut),
        date_fin: new Date(formData.date_fin),
      })
      // Réinitialiser le formulaire
      setFormData({
        ressource_id: '',
        site: '',
        date_debut: format(new Date(), 'yyyy-MM-dd'),
        date_fin: format(new Date(), 'yyyy-MM-dd'),
        type: 'Congés payés',
        competence: '',
        commentaire: '',
      })
    } catch (err) {
      console.error('[AbsencesPage] Erreur:', err)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestion des Absences</h1>

        {/* Formulaire */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Nouvelle absence</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ressource ID
              </label>
              <input
                type="text"
                value={formData.ressource_id}
                onChange={(e) => setFormData({ ...formData, ressource_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site
              </label>
              <input
                type="text"
                value={formData.site}
                onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="Formation">Formation</option>
                <option value="Congés payés">Congés payés</option>
                <option value="Maladie">Maladie</option>
                <option value="Paternité">Paternité</option>
                <option value="Maternité">Maternité</option>
                <option value="Parental">Parental</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compétence (optionnel)
              </label>
              <input
                type="text"
                value={formData.competence}
                onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commentaire
              </label>
              <textarea
                value={formData.commentaire}
                onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Enregistrer l'absence
              </button>
            </div>
          </form>
        </div>

        {/* Liste des absences */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Liste des absences</h2>
          
          {/* Filtres */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrer par ressource ID
              </label>
              <input
                type="text"
                value={ressourceId}
                onChange={(e) => setRessourceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Laisser vide pour toutes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrer par site
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Laisser vide pour tous"
              />
            </div>
          </div>

          {loading ? (
            <Loading />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Erreur: {error.message}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Ressource</th>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Site</th>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Type</th>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Date début</th>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Date fin</th>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Compétence</th>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Commentaire</th>
                    <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {absences.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-gray-300 p-4 text-center text-gray-500">
                        Aucune absence trouvée
                      </td>
                    </tr>
                  ) : (
                    absences.map((absence) => (
                      <tr key={absence.id}>
                        <td className="border border-gray-300 p-2">{absence.ressource_id}</td>
                        <td className="border border-gray-300 p-2">{absence.site}</td>
                        <td className="border border-gray-300 p-2">{absence.type}</td>
                        <td className="border border-gray-300 p-2">
                          {format(new Date(absence.date_debut), 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="border border-gray-300 p-2">
                          {format(new Date(absence.date_fin), 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="border border-gray-300 p-2">{absence.competence || '-'}</td>
                        <td className="border border-gray-300 p-2">{absence.commentaire || '-'}</td>
                        <td className="border border-gray-300 p-2">
                          <button
                            onClick={() => deleteAbsence(absence.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
