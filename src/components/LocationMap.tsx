interface LocationMapProps {
  locations: Array<{
    name: string
    canastillas: number
    disponibles: number
    color: string
  }>
}

export function LocationMap({ locations }: LocationMapProps) {
  return (
    <div className="space-y-3">
      {locations.map((location, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <div className="flex items-center space-x-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: location.color }}
            ></div>
            <div>
              <p className="text-sm font-medium text-gray-900">{location.name}</p>
              <p className="text-xs text-gray-500">
                {location.canastillas} canastillas · {location.disponibles} disponibles
              </p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      ))}
    </div>
  )
}