import { useState, useEffect } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { DynamicSelect } from './DynamicSelect'
import { supabase } from '@/lib/supabase'
import { useCanastillaAttributes } from '@/hooks/useCanastillaAttributes'
import type { TipoPropiedad } from '@/types'

interface CrearLoteCanastillasModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CrearLoteCanastillasModal({ isOpen, onClose, onSuccess }: CrearLoteCanastillasModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [proximoCodigo, setProximoCodigo] = useState<string>('')
  const [loadingCodigo, setLoadingCodigo] = useState(false)

  // Cargar atributos dinámicos
  const colores = useCanastillaAttributes('COLOR')
  const tamaños = useCanastillaAttributes('SIZE')
  const formas = useCanastillaAttributes('FORMA')
  const ubicaciones = useCanastillaAttributes('UBICACION')
  const areas = useCanastillaAttributes('AREA')
  const condiciones = useCanastillaAttributes('CONDICION')

  const [formData, setFormData] = useState({
    cantidad: 1,
    codigo_inicio: '',
    size: '',
    color: '',
    shape: '',
    condition: 'Bueno',
    current_location: '',
    current_area: '',
    tipo_propiedad: 'PROPIA' as TipoPropiedad,
    generar_qr: true,
  })

  // Cargar el próximo código disponible cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      obtenerProximoCodigo()
    }
  }, [isOpen])

  const obtenerProximoCodigo = async () => {
    try {
      setLoadingCodigo(true)
      setError('')

      // Obtener el último código usado ordenado por código descendente
      const { data, error: fetchError } = await supabase
        .from('canastillas')
        .select('codigo')
        .order('codigo', { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      let proximoCode = 'CAN-0001' // Código por defecto si no hay registros

      if (data && data.length > 0) {
        const ultimoCodigo = data[0].codigo
        
        // Extraer número del último código
        const match = ultimoCodigo.match(/(\d+)/)
        if (match) {
          const prefijo = ultimoCodigo.substring(0, match.index)
          const numeroUltimo = parseInt(match[0])
          const longitudNumero = match[0].length

          // Calcular el siguiente número (sumar 1 al último)
          const proximoNumero = numeroUltimo + 1
          const proximoFormateado = proximoNumero.toString().padStart(longitudNumero, '0')
          proximoCode = `${prefijo}${proximoFormateado}`
        }
      }

      setProximoCodigo(proximoCode)
      setFormData(prev => ({ ...prev, codigo_inicio: proximoCode }))
    } catch (err: any) {
      console.error('Error obteniendo próximo código:', err)
      setError('Error al cargar el próximo código disponible')
    } finally {
      setLoadingCodigo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setProgress(0)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      // Extraer el número inicial del código
      const codigoMatch = formData.codigo_inicio.match(/(\d+)/)
      if (!codigoMatch) {
        throw new Error('El código de inicio debe contener un número (ej: CAN-0001)')
      }

      const prefijo = formData.codigo_inicio.substring(0, codigoMatch.index)
      const numeroInicial = parseInt(codigoMatch[0])
      const longitudNumero = codigoMatch[0].length

      // Generar códigos que se van a crear para validar duplicados
      const codigosACrear = []
      let numeroActual = numeroInicial

      for (let i = 0; i < formData.cantidad; i++) {
        const numeroFormateado = numeroActual.toString().padStart(longitudNumero, '0')
        const codigo = `${prefijo}${numeroFormateado}`
        codigosACrear.push(codigo)
        numeroActual++
      }

      // Verificar si algún código ya existe en la base de datos
      const { data: existentes, error: checkError } = await supabase
        .from('canastillas')
        .select('codigo')
        .in('codigo', codigosACrear)

      if (checkError) throw checkError

      if (existentes && existentes.length > 0) {
        const codigosExistentes = existentes.map(c => c.codigo).join(', ')
        throw new Error(
          `Los siguientes códigos ya existen: ${codigosExistentes}. ` +
          `Por favor, recarga la página para obtener el próximo código disponible.`
        )
      }

      // Crear array de canastillas
      const canastillas = []
      numeroActual = numeroInicial

      for (let i = 0; i < formData.cantidad; i++) {
        const numeroFormateado = numeroActual.toString().padStart(longitudNumero, '0')
        const codigo = `${prefijo}${numeroFormateado}`
        const qr_code = formData.generar_qr ? `QR-${codigo}` : ''

        canastillas.push({
          codigo,
          qr_code,
          size: formData.size,
          color: formData.color,
          shape: formData.shape || null,
          status: 'DISPONIBLE',
          condition: formData.condition,
          current_location: formData.current_location || null,
          current_area: formData.current_area || null,
          current_owner_id: userId,
          tipo_propiedad: formData.tipo_propiedad,
        })

        numeroActual++
      }

      // Insertar en lotes de 100 para evitar timeouts
      const batchSize = 100
      let insertados = 0

      for (let i = 0; i < canastillas.length; i += batchSize) {
        const batch = canastillas.slice(i, i + batchSize)

        const { error: insertError } = await supabase
          .from('canastillas')
          .insert(batch)

        if (insertError) throw insertError

        insertados += batch.length
        setProgress(Math.round((insertados / canastillas.length) * 100))
      }

      onSuccess()
      onClose()

      // Resetear formulario
      setFormData({
        cantidad: 1,
        codigo_inicio: '',
        size: '',
        color: '',
        shape: '',
        condition: 'Bueno',
        current_location: '',
        current_area: '',
        tipo_propiedad: 'PROPIA',
        generar_qr: true,
      })
    } catch (err: any) {
      setError(err.message || 'Error al crear el lote de canastillas')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  if (!isOpen) return null

  const codigoFinal = (() => {
    try {
      const codigoMatch = formData.codigo_inicio.match(/(\d+)/)
      if (!codigoMatch) return ''

      const prefijo = formData.codigo_inicio.substring(0, codigoMatch.index)
      const numeroInicial = parseInt(codigoMatch[0])
      const longitudNumero = codigoMatch[0].length
      const numeroFinal = numeroInicial + formData.cantidad - 1
      const numeroFormateado = numeroFinal.toString().padStart(longitudNumero, '0')

      return `${prefijo}${numeroFormateado}`
    } catch {
      return ''
    }
  })()

  // Generar preview de códigos (máximo 10 para no saturar)
  const generarPreview = () => {
    try {
      const codigoMatch = formData.codigo_inicio.match(/(\d+)/)
      if (!codigoMatch) return []

      const prefijo = formData.codigo_inicio.substring(0, codigoMatch.index)
      const numeroInicial = parseInt(codigoMatch[0])
      const longitudNumero = codigoMatch[0].length
      const codigosPreview = []

      const limite = Math.min(10, formData.cantidad)
      for (let i = 0; i < limite; i++) {
        const numeroFormateado = (numeroInicial + i).toString().padStart(longitudNumero, '0')
        codigosPreview.push(`${prefijo}${numeroFormateado}`)
      }

      return codigosPreview
    } catch {
      return []
    }
  }

  const codigosPreview = generarPreview()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-primary-600 px-6 py-4 sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Crear Lote de Canastillas
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-white hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-6">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {loading && (
                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 px-4 py-3 rounded-r-lg">
                  <p className="text-sm font-semibold">Creando canastillas...</p>
                  <div className="mt-2 bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs mt-1">{progress}% completado</p>
                </div>
              )}

              {loadingCodigo && (
                <div className="bg-gray-50 border-l-4 border-gray-400 text-gray-700 px-4 py-3 rounded-r-lg">
                  <p className="text-sm">Obteniendo próximo código disponible...</p>
                </div>
              )}

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Se crearán <strong>{formData.cantidad}</strong> canastilla(s) secuencialmente.
                      {' '}Los códigos irán desde <strong>{formData.codigo_inicio}</strong> hasta <strong>{codigoFinal}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview de códigos */}
              {codigosPreview.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    Preview de códigos a crear:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {codigosPreview.map((codigo, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-gray-300 rounded px-3 py-2 text-center text-xs font-medium text-gray-700 hover:bg-primary-50 hover:border-primary-300 transition-colors"
                      >
                        {codigo}
                      </div>
                    ))}
                    {formData.cantidad > 10 && (
                      <div className="bg-white border border-dashed border-gray-300 rounded px-3 py-2 text-center text-xs font-medium text-gray-500 flex items-center justify-center">
                        +{formData.cantidad - 10} más
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cantidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad de Canastillas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Máximo: 10,000 canastillas</p>
                </div>

                {/* Código Inicio - BLOQUEADO */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Inicio (Automático) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.codigo_inicio}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-2.5">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Se genera automáticamente desde el siguiente código disponible
                  </p>
                </div>

                {/* Tamaño */}
                <DynamicSelect
                  label="Tamaño"
                  value={formData.size}
                  options={tamaños.attributes}
                  onChange={(value) => setFormData({ ...formData, size: value })}
                  onAddNew={tamaños.addAttribute}
                  required
                  placeholder="Seleccionar tamaño..."
                />

                {/* Color */}
                <DynamicSelect
                  label="Color"
                  value={formData.color}
                  options={colores.attributes}
                  onChange={(value) => setFormData({ ...formData, color: value })}
                  onAddNew={colores.addAttribute}
                  required
                  placeholder="Seleccionar color..."
                />

                {/* Forma */}
                <DynamicSelect
                  label="Forma"
                  value={formData.shape}
                  options={formas.attributes}
                  onChange={(value) => setFormData({ ...formData, shape: value })}
                  onAddNew={formas.addAttribute}
                  placeholder="Seleccionar forma..."
                />

                {/* Condición */}
                <DynamicSelect
                  label="Condición"
                  value={formData.condition}
                  options={condiciones.attributes}
                  onChange={(value) => setFormData({ ...formData, condition: value })}
                  onAddNew={condiciones.addAttribute}
                  required
                  placeholder="Seleccionar condición..."
                />

                {/* Tipo de Propiedad - Select fijo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Propiedad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tipo_propiedad}
                    onChange={(e) => setFormData({ ...formData, tipo_propiedad: e.target.value as TipoPropiedad })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="PROPIA">Propia</option>
                    <option value="ALQUILADA">Alquilada</option>
                  </select>
                </div>

                {/* Ubicación */}
                <DynamicSelect
                  label="Ubicación"
                  value={formData.current_location}
                  options={ubicaciones.attributes}
                  onChange={(value) => setFormData({ ...formData, current_location: value })}
                  onAddNew={ubicaciones.addAttribute}
                  placeholder="Seleccionar ubicación..."
                />

                {/* Área */}
                <DynamicSelect
                  label="Área"
                  value={formData.current_area}
                  options={areas.attributes}
                  onChange={(value) => setFormData({ ...formData, current_area: value })}
                  onAddNew={areas.addAttribute}
                  placeholder="Seleccionar área..."
                />

                {/* Generar QR */}
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.generar_qr}
                      onChange={(e) => setFormData({ ...formData, generar_qr: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Generar códigos QR automáticamente
                    </span>
                  </label>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 sticky bottom-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading || loadingCodigo}
              >
                Crear {formData.cantidad} Canastilla(s)
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}