import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User } from '@/types/index'

interface AuthState {
  user: User | null
  session: any
  loading: boolean
  setUser: (user: User | null) => void
  setSession: (session: any) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Obtener información adicional del usuario desde la tabla users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (userError) throw userError

        set({ user: userData, session: data.session })
      }
    } catch (error: any) {
      console.error('Error signing in:', error)
      throw error
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({ user: null, session: null })
    } catch (error: any) {
      console.error('Error signing out:', error)
      throw error
    }
  },

  initialize: async () => {
    try {
      set({ loading: true })

      // Obtener sesión actual
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        // Obtener datos del usuario
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) throw error

        set({ user: userData, session })
      }
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      set({ loading: false })
    }
  },
}))