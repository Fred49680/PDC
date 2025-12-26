'use client'

import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'error' | 'info'
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Annuler',
  type = 'warning'
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const typeStyles = {
    warning: {
      iconBg: 'bg-amber-400',
      iconColor: 'text-white',
      borderColor: 'border-amber-200',
      bgGradient: 'from-amber-50 to-yellow-50',
      buttonPrimary: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
    },
    error: {
      iconBg: 'bg-red-400',
      iconColor: 'text-white',
      borderColor: 'border-red-200',
      bgGradient: 'from-red-50 to-pink-50',
      buttonPrimary: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
    },
    info: {
      iconBg: 'bg-blue-400',
      iconColor: 'text-white',
      borderColor: 'border-blue-200',
      bgGradient: 'from-blue-50 to-indigo-50',
      buttonPrimary: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
    }
  }

  const styles = typeStyles[type]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay avec backdrop blur */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className={`
        relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 ${styles.borderColor}
        w-full max-w-md p-6 transform transition-all
        animate-in fade-in zoom-in duration-200
      `}>
        {/* Header avec icône */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0 shadow-lg`}>
            <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{title}</h3>
            <p className="text-gray-600 text-sm whitespace-pre-line">{message}</p>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          {cancelText && cancelText.length > 0 && (
            <button
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl font-medium transition-all text-sm
                       bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`
              px-5 py-2.5 rounded-xl font-medium transition-all text-sm text-white
              ${styles.buttonPrimary} shadow-lg hover:shadow-xl
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
