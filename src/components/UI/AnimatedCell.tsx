'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AnimatedCellProps {
  value: number | string
  isActive?: boolean
  isEditing?: boolean
  isWeekend?: boolean
  isHoliday?: boolean
  isConflict?: boolean
  isAbsence?: boolean
  isFormation?: boolean
  className?: string
  onClick?: () => void
  onDoubleClick?: () => void
  children?: React.ReactNode
}

export function AnimatedCell({
  value,
  isActive = false,
  isEditing = false,
  isWeekend = false,
  isHoliday = false,
  isConflict = false,
  isAbsence = false,
  isFormation = false,
  className = '',
  onClick,
  onDoubleClick,
  children,
}: AnimatedCellProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Déterminer la couleur de fond selon l'état
  const getBackgroundColor = () => {
    if (isFormation) return 'bg-purple-200 hover:bg-purple-300'
    if (isAbsence) return 'bg-gray-200 hover:bg-gray-300'
    if (isConflict) return 'bg-yellow-200 hover:bg-yellow-300'
    if (isHoliday) return 'bg-blue-100 hover:bg-blue-200'
    if (isWeekend) return 'bg-slate-100 hover:bg-slate-200'
    if (isActive) return 'bg-indigo-100 hover:bg-indigo-200'
    return 'bg-white hover:bg-gray-50'
  }

  return (
    <motion.td
      className={`
        relative px-3 py-2 text-center text-sm font-medium
        border border-gray-200 transition-all duration-200
        ${getBackgroundColor()}
        ${isEditing ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      initial={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.input
            key="editing"
            type="number"
            defaultValue={value}
            className="w-full text-center bg-transparent border-none outline-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            autoFocus
          />
        ) : (
          <motion.span
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children || value}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Indicateur visuel pour les états spéciaux */}
      {(isConflict || isAbsence || isFormation) && (
        <motion.div
          className="absolute top-0 right-0 w-2 h-2 rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            backgroundColor: isFormation
              ? '#a855f7'
              : isAbsence
              ? '#6b7280'
              : '#eab308',
          }}
        />
      )}
    </motion.td>
  )
}
