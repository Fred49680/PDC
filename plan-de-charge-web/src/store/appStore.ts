/**
 * Store global Zustand pour la gestion d'état de l'application
 * Remplace les patterns Excel/VBA par une gestion d'état moderne et réactive
 */
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Precision } from '@/types/charge'

interface AppState {
  // État global de l'application
  currentAffaireId: string | null
  currentSite: string | null
  currentPrecision: Precision
  dateDebut: Date | null
  dateFin: Date | null
  
  // UI State
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  loading: boolean
  error: string | null
  
  // Filtres
  selectedCompetences: Set<string>
  selectedRessources: Set<string>
  
  // Actions
  setCurrentAffaire: (affaireId: string | null, site: string | null) => void
  setPrecision: (precision: Precision) => void
  setDateRange: (dateDebut: Date, dateFin: Date) => void
  toggleSidebar: () => void
  toggleMobileMenu: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  toggleCompetence: (competence: string) => void
  toggleRessource: (ressource: string) => void
  clearFilters: () => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // État initial
        currentAffaireId: null,
        currentSite: null,
        currentPrecision: 'JOUR',
        dateDebut: null,
        dateFin: null,
        sidebarOpen: true,
        mobileMenuOpen: false,
        loading: false,
        error: null,
        selectedCompetences: new Set(),
        selectedRessources: new Set(),
        
        // Actions
        setCurrentAffaire: (affaireId, site) =>
          set({ currentAffaireId: affaireId, currentSite: site }),
        
        setPrecision: (precision) =>
          set({ currentPrecision: precision }),
        
        setDateRange: (dateDebut, dateFin) =>
          set({ dateDebut, dateFin }),
        
        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        
        toggleMobileMenu: () =>
          set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
        
        setLoading: (loading) =>
          set({ loading }),
        
        setError: (error) =>
          set({ error }),
        
        toggleCompetence: (competence) =>
          set((state) => {
            const newSet = new Set(state.selectedCompetences)
            if (newSet.has(competence)) {
              newSet.delete(competence)
            } else {
              newSet.add(competence)
            }
            return { selectedCompetences: newSet }
          }),
        
        toggleRessource: (ressource) =>
          set((state) => {
            const newSet = new Set(state.selectedRessources)
            if (newSet.has(ressource)) {
              newSet.delete(ressource)
            } else {
              newSet.add(ressource)
            }
            return { selectedRessources: newSet }
          }),
        
        clearFilters: () =>
          set({
            selectedCompetences: new Set(),
            selectedRessources: new Set(),
          }),
      }),
      {
        name: 'plan-de-charge-storage',
        partialize: (state) => ({
          currentAffaireId: state.currentAffaireId,
          currentSite: state.currentSite,
          currentPrecision: state.currentPrecision,
          dateDebut: state.dateDebut,
          dateFin: state.dateFin,
        }),
      }
    ),
    { name: 'AppStore' }
  )
)
