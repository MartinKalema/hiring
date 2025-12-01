"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

export interface FilterOption {
  id: string
  label: string
  count: number
  type: string // category name like "location", "employmentType", etc.
}

interface FilterSection {
  title: string
  type: string
  options: Omit<FilterOption, "type">[]
  isExpanded: boolean
}

interface JobFiltersProps {
  onFilterChange: (selectedFilters: FilterOption[]) => void
  initialSelectedFilters?: FilterOption[]
}

export default function JobFilters({ onFilterChange, initialSelectedFilters = [] }: JobFiltersProps) {
  const [filterSections, setFilterSections] = useState<FilterSection[]>([
    {
      title: "Location",
      type: "location",
      options: [
        { id: "kampala", label: "Kampala, Uganda", count: 8 },
        { id: "kyoto", label: "Kyoto, Japan", count: 4 },
      ],
      isExpanded: true,
    },
    {
      title: "Employment type",
      type: "employmentType",
      options: [
        { id: "full-time", label: "Full time", count: 10 },
        { id: "intern", label: "Intern", count: 3 },
        { id: "part-time", label: "Part time", count: 2 },
      ],
      isExpanded: true,
    },
    {
      title: "Category",
      type: "category",
      options: [
        { id: "software-development", label: "Software Development", count: 5 },
        { id: "data-science", label: "Data Science", count: 3 },
        { id: "product-management", label: "Product Management", count: 2 },
        { id: "design", label: "Design", count: 2 },
      ],
      isExpanded: true,
    },
    {
      title: "Team",
      type: "team",
      options: [
        { id: "ai-research", label: "AI Research", count: 3 },
        { id: "platform", label: "Platform", count: 4 },
        { id: "product", label: "Product", count: 3 },
        { id: "security", label: "Security", count: 2 },
        { id: "human-resources", label: "Human Resources", count: 2 },
        { id: "operations", label: "Operations", count: 1 },
      ],
      isExpanded: true,
    },
    {
      title: "Role type",
      type: "roleType",
      options: [
        { id: "individual-contributor", label: "Individual Contributor", count: 9 },
        { id: "people-manager", label: "People Manager", count: 3 },
      ],
      isExpanded: true,
    },
  ])

  const [selectedFilters, setSelectedFilters] = useState<FilterOption[]>(initialSelectedFilters)

  // Initialize with any initial filters
  useEffect(() => {
    if (initialSelectedFilters.length > 0) {
      setSelectedFilters(initialSelectedFilters)
    }
  }, [initialSelectedFilters])

  const toggleSection = (index: number) => {
    setFilterSections((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], isExpanded: !updated[index].isExpanded }
      return updated
    })
  }

  const toggleFilter = (option: Omit<FilterOption, "type">, sectionType: string) => {
    const fullOption = { ...option, type: sectionType }

    setSelectedFilters((prev) => {
      // Check if this filter is already selected
      const isSelected = prev.some((filter) => filter.id === option.id && filter.type === sectionType)

      let newFilters
      if (isSelected) {
        // Remove the filter if it's already selected
        newFilters = prev.filter((filter) => !(filter.id === option.id && filter.type === sectionType))
      } else {
        // Add the filter if it's not already selected
        newFilters = [...prev, fullOption]
      }

      // Notify parent component about the change
      onFilterChange(newFilters)
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setSelectedFilters([])
    onFilterChange([])
  }

  const isFilterSelected = (optionId: string, sectionType: string) => {
    return selectedFilters.some((filter) => filter.id === optionId && filter.type === sectionType)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm text-gray-800">Filters</h3>
        <Button variant="link" className="text-xs text-aibos-blue p-0 h-auto" onClick={clearAllFilters}>
          Clear filters
        </Button>
      </div>

      <div className="space-y-4">
        {filterSections.map((section, index) => (
          <div key={section.title} className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => toggleSection(index)}>
              <h4 className="font-medium text-xs text-gray-800">{section.title}</h4>
              <span className="text-xs">{section.isExpanded ? "−" : "+"}</span>
            </div>

            {section.isExpanded && (
              <div className="space-y-1.5">
                {section.options.map((option) => (
                  <div key={option.id} className="flex items-center">
                    <Checkbox
                      id={`${section.type}-${option.id}`}
                      className="mr-2 h-3 w-3 data-[state=checked]:bg-aibos-blue"
                      checked={isFilterSelected(option.id, section.type)}
                      onCheckedChange={() => toggleFilter(option, section.type)}
                    />
                    <label
                      htmlFor={`${section.type}-${option.id}`}
                      className="text-xs text-gray-700 flex justify-between w-full cursor-pointer"
                      onClick={() => toggleFilter(option, section.type)}
                    >
                      <span>{option.label}</span>
                      <span className="text-gray-500">({option.count})</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
