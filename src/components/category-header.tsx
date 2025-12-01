interface CategoryHeaderProps {
  category: string
  jobCount: number
  description?: string
  stacked?: boolean
}

export default function CategoryHeader({ category, jobCount, description, stacked = false }: CategoryHeaderProps) {
  return (
    <div className="bg-aibos-blue/10 py-24 mb-6 text-center relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-aibos-blue/5 rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-aibos-blue/5 rounded-full transform -translate-x-1/3 translate-y-1/3"></div>

      <div className="container mx-auto px-4 relative z-10">
        <p className="text-xs text-aibos-blue font-medium mb-2">{jobCount} OPEN POSITIONS</p>
        {stacked ? (
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold text-gray-800 leading-tight">
              {category.split(" ")[0]}
              <br />
              {category.split(" ").slice(1).join(" ")}
            </h1>
          </div>
        ) : (
          <h1 className="text-3xl font-bold text-gray-800 mb-3">{category}</h1>
        )}
        {description && <p className="text-gray-600 max-w-2xl mx-auto font-mono text-xs mt-3">{description}</p>}
      </div>
    </div>
  )
}
