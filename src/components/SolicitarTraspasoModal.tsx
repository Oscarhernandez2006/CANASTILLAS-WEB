import { useState, useEffect } from 'react'
import { Button } from './Button'
import { CanastillaLoteSelector } from './CanastillaLoteSelector'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { User, Canastilla } from '@/types'

interface LoteItem {
  id: string
  size: string
  color: string
  ubicacion: string
  cantidad: number
  canastillaIds: string[]
}

interface SolicitarTraspasoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SolicitarTraspasoModal({
  isOpen,
  onClose,
  onSuccess,
}: SolicitarTraspasoModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const { user: currentUser } = useAuthStore()

  const [canastillasDisponibles, setCanastillasDisponibles] = useState<Canastilla[]>([])
  const [selectedCanastillas, setSelectedCanastillas] = useState<Set<string>>(new Set())
  const [lotes, setLotes] = useState<LoteItem[]>([])

  const [formData, setFormData] = useState({
    to_user_id: '',
    reason: '',
    notes: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      fetchCanastillasDisponibles()
    }
  }, [isOpen])

  const fetchCanastillasDisponibles = async () => {
    try {
      if (!currentUser) return

      // Obtener canastillas disponibles
      const { data: disponibles, error: errorDisponibles } = await supabase
        .from('canastillas')
        .select('*')
        .eq('current_owner_id', currentUser.id)
        .eq('status', 'DISPONIBLE')
        .order('codigo')

      if (errorDisponibles) throw errorDisponibles

      // Obtener canastillas en alquiler INTERNO (estas sí se pueden traspasar)
      const { data: enAlquiler, error: errorAlquiler } = await supabase
        .from('canastillas')
        .select('*')
        .eq('current_owner_id', currentUser.id)
        .eq('status', 'EN_ALQUILER')
        .order('codigo')

      if (errorAlquiler) throw errorAlquiler

      // Si hay canastillas en alquiler, filtrar solo las que están en alquiler INTERNO
      let canastillasAlquilerInterno: Canastilla[] = []

      if (enAlquiler && enAlquiler.length > 0) {
        const canastillaIds = enAlquiler.map(c => c.id)

        // Obtener los rental_items para saber qué tipo de alquiler tienen
        const { data: rentalItems, error: rentalError } = await supabase
          .from('rental_items')
          .select(`
            canastilla_id,
            rental:rentals!inner(rental_type, status)
          `)
          .in('canastilla_id', canastillaIds)
          .eq('rental.status', 'ACTIVO')

        if (!rentalError && rentalItems) {
          // Filtrar solo las que están en alquiler INTERNO
          const idsAlquilerInterno = rentalItems
            .filter((item: any) => item.rental?.rental_type === 'INTERNO')
            .map((item: any) => item.canastilla_id)

          canastillasAlquilerInterno = enAlquiler.filter(c =>
            idsAlquilerInterno.includes(c.id)
          )
        }
      }

      // Combinar disponibles + alquiler interno
      const todasCanastillas = [...(disponibles || []), ...canastillasAlquilerInterno]

      // Ordenar por código
      todasCanastillas.sort((a, b) => a.codigo.localeCompare(b.codigo))

      setCanastillasDisponibles(todasCanastillas)
    } catch (error) {
      console.error('Error fetching canastillas:', error)
      setCanastillasDisponibles([])
    }
  }

  const handleLotesChange = (nuevosLotes: LoteItem[]) => {
    setLotes(nuevosLotes)
    const allIds = nuevosLotes.flatMap(lote => lote.canastillaIds)
    setSelectedCanastillas(new Set(allIds))
  }

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .neq('id', currentUser?.id || '')
        .order('first_name')

      if (error) throw error
      
      setUsers(data || [])
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError('Error al cargar usuarios')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!currentUser) throw new Error('Usuario no autenticado')
      if (!formData.to_user_id) throw new Error('Selecciona un usuario destino')
      if (selectedCanastillas.size === 0) throw new Error('Selecciona al menos una canastilla')

      const canastillaIds = Array.from(selectedCanastillas)

      // 1. Crear el traspaso
      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .insert([{
          from_user_id: currentUser.id,
          to_user_id: formData.to_user_id,
          status: 'PENDIENTE',
          reason: formData.reason,
          notes: formData.notes,
        }])
        .select()
        .single()

      if (transferError) throw transferError

      // 2. Insertar las canastillas del traspaso
      const transferItems = canastillaIds.map(canastillaId => ({
        transfer_id: transfer.id,
        canastilla_id: canastillaId,
      }))

      const { error: itemsError } = await supabase
        .from('transfer_items')
        .insert(transferItems)

      if (itemsError) throw itemsError

      // 3. Crear notificación
      await supabase
        .from('notifications')
        .insert([{
          user_id: formData.to_user_id,
          type: 'TRASPASO_RECIBIDO',
          title: 'Nueva solicitud de traspaso',
          message: `${currentUser.first_name} ${currentUser.last_name} te ha enviado una solicitud de traspaso de ${canastillaIds.length} canastilla${canastillaIds.length !== 1 ? 's' : ''}.`,
          related_id: transfer.id
        }])

      alert('✅ Traspaso creado exitosamente')
      onSuccess()
      handleClose()
    } catch (err: any) {
      console.error('Submit error:', err)
      setError(err.message || 'Error al crear el traspaso')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({ to_user_id: '', reason: '', notes: '' })
    setSelectedCanastillas(new Set())
    setLotes([])
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-primary-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Solicitar Traspaso
                </h3>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Selector de lotes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Seleccionar Canastillas
                </label>
                <CanastillaLoteSelector
                  canastillasDisponibles={canastillasDisponibles}
                  onLotesChange={handleLotesChange}
                  selectedIds={selectedCanastillas}
                />
              </div>

              {/* Resumen de selección */}
              {selectedCanastillas.size > 0 && (
                <div className="p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Total seleccionado: <strong>{selectedCanastillas.size}</strong> canastilla{selectedCanastillas.size !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transferir a *
                </label>
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                    <span className="ml-2 text-sm text-gray-600">Cargando usuarios...</span>
                  </div>
                ) : (
                  <>
                    <select
                      value={formData.to_user_id}
                      onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Seleccionar usuario...</option>
                      {(users || []).map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </option>
                      ))}
                    </select>
                    {(users || []).length === 0 && (
                      <p className="mt-2 text-sm text-red-600">
                        No hay usuarios disponibles
                      </p>
                    )}
                    {(users || []).length > 0 && (
                      <p className="mt-2 text-sm text-gray-500">
                        {users.length} usuario{users.length !== 1 ? 's' : ''} disponible{users.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Razón del Traspaso *
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Ej: Canastillas limpias para despacho"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas opcionales..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading || (users || []).length === 0 || selectedCanastillas.size === 0}
              >
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}