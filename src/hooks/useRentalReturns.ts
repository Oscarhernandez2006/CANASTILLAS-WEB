import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RentalReturn, RentalReturnItem } from '@/types'

interface CreateReturnParams {
  rentalId: string
  canastillaIds: string[]
  rentalItemIds: string[]
  daysCharged: number
  amount: number
  notes?: string
  processedBy: string
}

export function useRentalReturns() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obtener devoluciones de un alquiler
  const getReturnsByRentalId = useCallback(async (rentalId: string) => {
    try {
      const { data, error } = await supabase
        .from('rental_returns')
        .select(`
          *,
          processed_by_user:users!rental_returns_processed_by_fkey(*),
          rental_return_items(
            *,
            canastilla:canastillas(*)
          )
        `)
        .eq('rental_id', rentalId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as RentalReturn[]
    } catch (err: any) {
      setError(err.message)
      return []
    }
  }, [])

  // Generar número de factura
  const generateInvoiceNumber = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .rpc('generate_rental_invoice_number')

      if (error) throw error
      return data as string
    } catch (err: any) {
      // Fallback: generar número localmente
      const timestamp = Date.now().toString().slice(-8)
      return `FAC${timestamp}`
    }
  }, [])

  // Crear una devolución parcial
  const createReturn = useCallback(async (params: CreateReturnParams) => {
    setLoading(true)
    setError(null)

    try {
      // 1. Generar número de factura
      const invoiceNumber = await generateInvoiceNumber()

      // 2. Crear el registro de devolución
      const { data: rentalReturn, error: returnError } = await supabase
        .from('rental_returns')
        .insert({
          rental_id: params.rentalId,
          return_date: new Date().toISOString(),
          days_charged: params.daysCharged,
          amount: params.amount,
          invoice_number: invoiceNumber,
          notes: params.notes,
          processed_by: params.processedBy
        })
        .select()
        .single()

      if (returnError) throw returnError

      // 3. Crear los items de la devolución
      const returnItems = params.canastillaIds.map((canastillaId, index) => ({
        rental_return_id: rentalReturn.id,
        canastilla_id: canastillaId,
        rental_item_id: params.rentalItemIds[index] || null
      }))

      const { error: itemsError } = await supabase
        .from('rental_return_items')
        .insert(returnItems)

      if (itemsError) throw itemsError

      // 4. Actualizar estado de canastillas a DISPONIBLE
      const { error: canastillasError } = await supabase
        .from('canastillas')
        .update({ status: 'DISPONIBLE' })
        .in('id', params.canastillaIds)

      if (canastillasError) throw canastillasError

      // 5. Obtener el rental actual para calcular contadores
      // Necesitamos también el conteo de rental_items para calcular pending_items_count si no está inicializado
      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .select(`
          pending_items_count,
          returned_items_count,
          total_invoiced,
          rental_items(id)
        `)
        .eq('id', params.rentalId)
        .single()

      if (rentalError) throw rentalError

      // Si pending_items_count no está inicializado, usar el conteo de rental_items
      const totalItems = rental.rental_items?.length || 0
      const currentPendingCount = rental.pending_items_count ?? totalItems
      const currentReturnedCount = rental.returned_items_count ?? 0

      const newReturnedCount = currentReturnedCount + params.canastillaIds.length
      const newPendingCount = currentPendingCount - params.canastillaIds.length
      const newTotalInvoiced = (rental.total_invoiced || 0) + params.amount

      // 6. Determinar si el alquiler debe marcarse como RETORNADO
      const shouldClose = newPendingCount <= 0

      // 7. Actualizar el rental
      const rentalUpdate: any = {
        returned_items_count: newReturnedCount,
        pending_items_count: Math.max(0, newPendingCount),
        total_invoiced: newTotalInvoiced
      }

      if (shouldClose) {
        rentalUpdate.status = 'RETORNADO'
        rentalUpdate.actual_return_date = new Date().toISOString()
        rentalUpdate.actual_days = params.daysCharged
        rentalUpdate.total_amount = newTotalInvoiced
        rentalUpdate.invoice_number = invoiceNumber
      }

      const { error: updateError } = await supabase
        .from('rentals')
        .update(rentalUpdate)
        .eq('id', params.rentalId)

      if (updateError) throw updateError

      return {
        success: true,
        rentalReturn: rentalReturn as RentalReturn,
        invoiceNumber,
        isClosed: shouldClose
      }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [generateInvoiceNumber])

  // Calcular el monto de una devolución
  const calculateReturnAmount = useCallback((
    canastillasCount: number,
    dailyRate: number,
    daysCharged: number,
    rentalType: 'INTERNO' | 'EXTERNO'
  ) => {
    if (rentalType === 'INTERNO') {
      // Tarifa fija para internos
      return canastillasCount * dailyRate
    } else {
      // Tarifa por día para externos
      return canastillasCount * dailyRate * daysCharged
    }
  }, [])

  // Calcular días desde el inicio del alquiler
  const calculateDaysSinceStart = useCallback((startDate: string) => {
    const start = new Date(startDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays) // Mínimo 1 día
  }, [])

  return {
    loading,
    error,
    getReturnsByRentalId,
    createReturn,
    calculateReturnAmount,
    calculateDaysSinceStart,
    generateInvoiceNumber
  }
}
