import { Button } from "@/components/ui/button"
import Link from "next/link"

interface ImpactSectionProps {
  title: string
  description: string
  buttonText?: string
  buttonLink?: string
}

export default function ImpactSection({
  title,
  description,
  buttonText = "View open roles",
  buttonLink = "/jobs",
}: ImpactSectionProps) {
  return (
    <div className="py-12 bg-white border-t border-b border-gray-100">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        <div className="font-mono text-[0.9rem] text-gray-600 mb-8 space-y-4">
          <p>{description}</p>
        </div>
        {buttonText && buttonLink && (
          <div className="text-right">
            <Link href={buttonLink}>
              <Button className="bg-aibos-blue hover:bg-aibos-darkBlue text-white">{buttonText}</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
