'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface SmoothInputProps {
  value: number | string
  onChange: (value: number) => void
  onBlur?: () => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function SmoothInput({
  value,
  onChange,
  onBlur,
  min = 0,
  max,
  step = 1,
  disabled = false,
  className = '',
  placeholder = '0',
}: SmoothInputProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [localValue, setLocalValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(String(value))
    }
  }, [value, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)

    const numValue = parseFloat(newValue)
    if (!isNaN(numValue)) {
      const clampedValue = Math.max(min, max !== undefined ? Math.min(max, numValue) : numValue)
      onChange(clampedValue)
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    inputRef.current?.select()
  }

  const handleBlur = () => {
    setIsFocused(false)
    setLocalValue(String(value))
    onBlur?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setLocalValue(String(value))
      inputRef.current?.blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const numValue = parseFloat(localValue) || 0
      const newValue = Math.min(max !== undefined ? max : Infinity, numValue + step)
      onChange(newValue)
      setLocalValue(String(newValue))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const numValue = parseFloat(localValue) || 0
      const newValue = Math.max(min, numValue - step)
      onChange(newValue)
      setLocalValue(String(newValue))
    }
  }

  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <input
        ref={inputRef}
        type="number"
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full px-3 py-2 text-center text-sm font-medium
          bg-white border-2 rounded-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
          ${isFocused ? 'border-indigo-500 shadow-md' : 'border-gray-200'}
        `}
      />
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2
                     bg-gray-900 text-white text-xs px-2 py-1 rounded
                     whitespace-nowrap pointer-events-none"
        >
          ↑↓ pour ajuster • Entrée pour valider • Échap pour annuler
        </motion.div>
      )}
    </motion.div>
  )
}
