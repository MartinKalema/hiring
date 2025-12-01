interface CategoryBannerProps {
  title: string
}

export default function CategoryBanner({ title }: CategoryBannerProps) {
  return (
    <div className="bg-aibos-blue/10 py-8 mb-12 text-center rounded-lg border border-aibos-blue/20 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-aibos-blue/5 rounded-full transform translate-x-1/3 -translate-y-1/3"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-aibos-blue/5 rounded-full transform -translate-x-1/3 translate-y-1/3"></div>

      <h2 className="text-2xl font-bold text-aibos-blue relative z-10">Find jobs in {title}</h2>
    </div>
  )
}
