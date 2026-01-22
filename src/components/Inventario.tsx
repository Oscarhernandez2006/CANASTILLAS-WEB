import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from './LoadingSpinner'

interface LoteItem {
  id: string
  color: string
  size: string
  shape?: string
  condition?: string
  tipoPropiedad: 'PROPIA' | 'ALQUILADA'
  estado: string
  cantidad: number
  canastillas: string[]
}

export function Inventario() {
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [lotesPaginados, setLotesPaginados] = useState<LoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    cargarInventario()
  }, [])

  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    setLotesPaginados(lotes.slice(startIndex, endIndex))
  }, [lotes, currentPage])

  const cargarInventario = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener todas las canastillas
      const { data: canastillas, error: canErr } = await supabase
        .from('canastillas')
        .select('*')
        .order('codigo', { ascending: true })

      if (canErr) throw canErr

      // Obtener canastillas dadas de baja
      const { data: bajas, error: bajasErr } = await supabase
        .from('canastillas_bajas')
        .select('*')

      if (bajasErr) throw bajasErr

      // Agrupar por: color + tamaño + forma + condición + tipo_propiedad + estado
      const lotesMap = new Map<string, LoteItem>()

      // PRIMERO: Procesar canastillas activas
      canastillas?.forEach((c) => {
        const estado = c.status
        const key = `${c.color}|${c.size}|${c.shape || 'SIN_FORMA'}|${c.condition || 'SIN_CONDICION'}|${c.tipo_propiedad}|${estado}`

        if (!lotesMap.has(key)) {
          lotesMap.set(key, {
            id: key,
            color: c.color,
            size: c.size,
            shape: c.shape || undefined,
            condition: c.condition || undefined,
            tipoPropiedad: c.tipo_propiedad,
            estado: estado,
            cantidad: 0,
            canastillas: [],
          })
        }

        const lote = lotesMap.get(key)!
        lote.cantidad += 1
        lote.canastillas.push(c.codigo)
      })

      // SEGUNDO: Procesar canastillas en baja
      bajas?.forEach((b) => {
        const estado = 'DADA_DE_BAJA'
        const key = `${b.color}|${b.size}|${b.shape || 'SIN_FORMA'}|${b.condition || 'SIN_CONDICION'}|${b.tipo_propiedad}|${estado}`

        if (!lotesMap.has(key)) {
          lotesMap.set(key, {
            id: key,
            color: b.color,
            size: b.size,
            shape: b.shape || undefined,
            condition: b.condition || undefined,
            tipoPropiedad: b.tipo_propiedad,
            estado: estado,
            cantidad: 0,
            canastillas: [],
          })
        }

        const lote = lotesMap.get(key)!
        lote.cantidad += 1
        lote.canastillas.push(b.codigo)
      })

      // Convertir a array y ordenar
      let lotesArray: LoteItem[] = Array.from(lotesMap.values()).sort((a, b) => {
        if (a.tipoPropiedad !== b.tipoPropiedad) {
          return a.tipoPropiedad === 'PROPIA' ? -1 : 1
        }
        if (a.color !== b.color) {
          return a.color.localeCompare(b.color)
        }
        if (a.size !== b.size) {
          return a.size.localeCompare(b.size)
        }
        const estadoOrder: Record<string, number> = {
          'DISPONIBLE': 1,
          'EN_ALQUILER': 2,
          'EN_LAVADO': 3,
          'EN_USO_INTERNO': 4,
          'EN_REPARACION': 5,
          'FUERA_SERVICIO': 6,
          'EXTRAVIADA': 7,
          'DADA_DE_BAJA': 8,
        }
        return (estadoOrder[a.estado] || 9) - (estadoOrder[b.estado] || 9)
      })

      setLotes(lotesArray)
      setCurrentPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar inventario')
      console.error('Error cargando inventario:', err)
    } finally {
      setLoading(false)
    }
  }

  const getEstadoLabel = (estado: string): string => {
    const labels: Record<string, string> = {
      'DISPONIBLE': '✅ Disponible',
      'EN_ALQUILER': '🔄 En Alquiler',
      'EN_LAVADO': '🧼 En Lavado',
      'EN_USO_INTERNO': '🏢 Uso Interno',
      'EN_REPARACION': '🔧 Reparación',
      'FUERA_SERVICIO': '⛔ Fuera Servicio',
      'EXTRAVIADA': '❓ Extraviada',
      'DADA_DE_BAJA': '🗑️ Destrucción',
    }
    return labels[estado] || estado
  }

  const getEstadoColor = (estado: string): string => {
    const colors: Record<string, string> = {
      'DISPONIBLE': 'bg-green-50 border-green-200',
      'EN_ALQUILER': 'bg-purple-50 border-purple-200',
      'EN_LAVADO': 'bg-cyan-50 border-cyan-200',
      'EN_USO_INTERNO': 'bg-yellow-50 border-yellow-200',
      'EN_REPARACION': 'bg-orange-50 border-orange-200',
      'FUERA_SERVICIO': 'bg-red-50 border-red-200',
      'EXTRAVIADA': 'bg-red-100 border-red-300',
      'DADA_DE_BAJA': 'bg-gray-300 border-gray-500',
    }
    return colors[estado] || 'bg-gray-50 border-gray-200'
  }

  const getTipoLabel = (tipo: string): string => {
    return tipo === 'PROPIA' ? '🏢 Propia' : '🔄 Alquilada'
  }

  const getTipoColor = (tipo: string): string => {
    return tipo === 'PROPIA' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
  }

  // CALCULAR ESTADÍSTICAS
  const propias = lotes
    .filter(l => l.tipoPropiedad === 'PROPIA' && l.estado !== 'DADA_DE_BAJA')
    .reduce((sum, l) => sum + l.cantidad, 0)
  const alquiladas = lotes
    .filter(l => l.tipoPropiedad === 'ALQUILADA' && l.estado !== 'DADA_DE_BAJA')
    .reduce((sum, l) => sum + l.cantidad, 0)
  const enDestruccion = lotes
    .filter(l => l.estado === 'DADA_DE_BAJA')
    .reduce((sum, l) => sum + l.cantidad, 0)
  const totalActivas = propias + alquiladas

  const totalPages = Math.ceil(lotes.length / itemsPerPage)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventario Detallado</h1>
        <p className="text-gray-500 mt-2">
          Lotes agrupados por características, tipo de propiedad y estado
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-lg border bg-blue-50 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-600 text-sm font-medium">Total Activas</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalActivas}</p>
          </div>
        </div>
        <div className="p-6 rounded-lg border bg-green-50 border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-600 text-sm font-medium">Propias</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{propias}</p>
          </div>
        </div>
        <div className="p-6 rounded-lg border bg-amber-50 border-amber-200 shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-600 text-sm font-medium">Alquiladas</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{alquiladas}</p>
          </div>
        </div>
        <div className="p-6 rounded-lg border bg-gray-300 border-gray-500 shadow-sm hover:shadow-md transition-shadow">
          <div>
            <p className="text-gray-700 text-sm font-medium">En Destrucción</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{enDestruccion}</p>
          </div>
        </div>
      </div>

      {/* Tabla de Lotes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Lotes</h2>
          <p className="text-sm text-gray-500 mt-1">
            {lotes.length} lotes totales ({totalActivas} canastillas activas)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Color</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tamaño</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Forma</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Condición</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {lotesPaginados.length > 0 ? (
                lotesPaginados.map((lote) => (
                  <tr key={lote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getTipoColor(lote.tipoPropiedad)}`}>
                        {getTipoLabel(lote.tipoPropiedad)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{
                            backgroundColor: lote.color.toLowerCase().replace(/ /g, ''),
                          }}
                        />
                        <span className="text-sm font-medium text-gray-900">{lote.color}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{lote.size}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{lote.shape || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{lote.condition || '-'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoColor(lote.estado)}`}>
                        {getEstadoLabel(lote.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800">
                        {lote.cantidad}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="font-medium">No hay lotes para mostrar</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-sm text-gray-600">
            Mostrando {lotesPaginados.length === 0 ? 0 : Math.min((currentPage - 1) * itemsPerPage + 1, lotes.length)} a{' '}
            {Math.min(currentPage * itemsPerPage, lotes.length)} de {lotes.length} lotes
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                ← Anterior
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    Math.abs(page - currentPage) <= 1
                  )
                  .map((page, idx, arr) => {
                    if (idx > 0 && arr[idx - 1] !== page - 1) {
                      return (
                        <span key={`dots-${page}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      )
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                          currentPage === page
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}