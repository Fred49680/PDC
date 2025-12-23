'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, X } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DateRangePickerModalProps {
  isOpen: boolean
  dateDebut: Date
  dateFin: Date
  onConfirm: (dateDebut: Date, dateFin: Date) => void
  onCancel: () => void
}

export function DateRangePickerModal({
  isOpen,
  dateDebut: initialDateDebut,
  dateFin: initialDateFin,
  onConfirm,
  onCancel,
}: DateRangePickerModalProps) {
  const [dateDebut, setDateDebut] = useState(initialDateDebut)
  const [dateFin, setDateFin] = useState(initialDateFin)

  // Synchroniser avec les props quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setDateDebut(initialDateDebut)
      setDateFin(initialDateFin)
    }
  }, [isOpen, initialDateDebut, initialDateFin])

  if (!isOpen) return null

  const handleConfirm = () => {
    // Vérifier que dateFin >= dateDebut
    if (dateFin < dateDebut) {
      alert('La date de fin doit être postérieure ou égale à la date de début')
      return
    }
    onConfirm(dateDebut, dateFin)
  }

  // Formater les dates pour les inputs HTML (format YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay avec backdrop blur */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="
        relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-blue-200
        w-full max-w-md p-6 transform transition-all
        animate-in fade-in zoom-in duration-200
      ">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Période personnalisée</h3>
              <p className="text-sm text-gray-500">Sélectionnez une plage de dates</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Formulaire */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de début
            </label>
            <input
              type="date"
              value={formatDateForInput(dateDebut)}
              onChange={(e) => {
                const newDate = new Date(e.target.value)
                if (!isNaN(newDate.getTime())) {
                  setDateDebut(newDate)
                }
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">
              {format(dateDebut, 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin
            </label>
            <input
              type="date"
              value={formatDateForInput(dateFin)}
              onChange={(e) => {
                const newDate = new Date(e.target.value)
                if (!isNaN(newDate.getTime())) {
                  setDateFin(newDate)
                }
              }}
              min={formatDateForInput(dateDebut)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">
              {format(dateFin, 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          </div>

          {/* Aperçu de la période */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Période sélectionnée :</p>
            <p className="text-lg font-bold text-blue-700">
              {format(dateDebut, 'dd/MM/yyyy', { locale: fr })} → {format(dateFin, 'dd/MM/yyyy', { locale: fr })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) + 1} jour(s)
            </p>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl font-medium transition-all text-sm
                     bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl font-medium transition-all text-sm text-white
                     bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600
                     shadow-lg hover:shadow-xl"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  )

  // Utiliser createPortal pour rendre le modal en dehors de la hiérarchie DOM
  // Cela garantit qu'il sera toujours au-dessus des autres modals
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}

