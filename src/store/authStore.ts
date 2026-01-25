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
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>
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

  signIn: async (email: string, password: string, rememberMe: boolean = true) => {
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

        // Guardar preferencia de "Recordarme"
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
        } else {
          localStorage.removeItem('rememberMe')
          // Usar sessionStorage para indicar sesión temporal
          sessionStorage.setItem('tempSession', 'true')
        }

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
      // Limpiar flags de sesión
      localStorage.removeItem('rememberMe')
      sessionStorage.removeItem('tempSession')
      set({ user: null, session: null })
    } catch (error: any) {
      console.error('Error signing out:', error)
      throw error
    }
  },

  initialize: async () => {
    try {
      set({ loading: true })

      // Verificar si es una sesión temporal que ya expiró (cerró el navegador)
      const rememberMe = localStorage.getItem('rememberMe')
      const tempSession = sessionStorage.getItem('tempSession')

      // Si no tiene "Recordarme" y no hay sesión temporal, cerrar sesión
      if (!rememberMe && !tempSession) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Había sesión pero el usuario no marcó "Recordarme" y cerró el navegador
          await supabase.auth.signOut()
          set({ user: null, session: null, loading: false })
          return
        }
      }

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