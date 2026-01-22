import { useState } from 'react'
import { useInventarioContext } from '@/context/InventarioContext'

interface DynamicSelectProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  onAddNew: (value: string) => void
  required?: boolean
  placeholder?: string
  tipoAtributo?: 'COLOR' | 'SIZE' | 'FORMA' | 'CONDICION' | 'UBICACION' | 'AREA'
}

export function DynamicSelect({
  label,
  value,
  options,
  onChange,
  onAddNew,
  required,
  placeholder,
  tipoAtributo,
}: DynamicSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Usar contexto - pero con try/catch para cuando no esté disponible
  let inventarioContext: any = null
  try {
    inventarioContext = useInventarioContext()
  } catch {
    // El contexto no está disponible
  }

  const handleAddNew = async () => {
    if (!newValue.trim()) {
      setError('El valor no puede estar vacío')
      return
    }

    // Validar que no exista ya
    if (options.includes(newValue)) {
      setError('Este valor ya existe')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await onAddNew(newValue)

      // Notificar al contexto si está disponible
      if (tipoAtributo && inventarioContext) {
        switch (tipoAtributo) {
          case 'COLOR':
            inventarioContext.agregarColor(newValue)
            break
          case 'SIZE':
            inventarioContext.agregarTamano(newValue)
            break
          case 'FORMA':
            inventarioContext.agregarForma(newValue)
            break
          case 'CONDICION':
            inventarioContext.agregarCondicion(newValue)
            break
          case 'UBICACION':
            inventarioContext.agregarUbicacion(newValue)
            break
          case 'AREA':
            inventarioContext.agregarArea(newValue)
            break
        }
      }

      onChange(newValue)
      setNewValue('')
      setShowAddForm(false)
      setIsOpen(false)
    } catch (err: any) {
      setError(err.message || 'Error al agregar nuevo valor')
      console.error('Error adding new value:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNew()
    }
    if (e.key === 'Escape') {
      setShowAddForm(false)
      setNewValue('')
      setError(null)
    }
  }

  const handleCancelForm = () => {
    setShowAddForm(false)
    setNewValue('')
    setError(null)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(false)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
          required={required}
        >
          <option value="">{placeholder || 'Seleccionar...'}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {/* Dropdown Icon */}
        <div className="absolute right-3 top-2.5 pointer-events-none">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
            {/* List of Options */}
            <div className="max-h-48 overflow-y-auto">
              {options.length > 0 ? (
                options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option)
                      setIsOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-primary-50 text-sm text-gray-700 transition-colors"
                  >
                    {option}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500 text-center">
                  No hay opciones disponibles
                </div>
              )}
            </div>

            {/* Add New Button */}
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full text-left px-4 py-2 border-t border-gray-200 text-primary-600 hover:bg-primary-50 text-sm font-medium transition-colors"
            >
              + Agregar nuevo {label.toLowerCase()}
            </button>

            {/* Add Form */}
            {showAddForm && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                {error && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    {error}
                  </div>
                )}

                <input
                  type="text"
                  placeholder={`Nuevo ${label.toLowerCase()}`}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                  disabled={loading}
                />

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleAddNew}
                    disabled={loading || !newValue.trim()}
                    className="flex-1 px-3 py-1 bg-primary-600 text-white rounded text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Agregando...' : 'Agregar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    disabled={loading}
                    className="flex-1 px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}