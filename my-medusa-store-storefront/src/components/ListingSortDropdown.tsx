"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function ListingSortDropdown() {
  // 1. Pure React state to force the menu open/closed
  const [isOpen, setIsOpen] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeSort = searchParams.get("sortBy") || "created_at"

  const sortLabels: Record<string, string> = {
    created_at: "Latest",
    price_asc: "Price: Low to High",
    price_desc: "Price: High to Low",
  }

  const handleSortChange = (value: string) => {
    // Debug log to ensure the click is registering
    console.log("Sorting clicked:", value) 

    const params = new URLSearchParams(searchParams.toString())
    params.set("sortBy", value)
    
    // Close the menu automatically after clicking an option
    setIsOpen(false) 
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    // We removed the Bootstrap "dropdown" class that was causing conflicts
    <div className="ms-auto" style={{ position: "relative" }}>
      
      {/* 2. We use a standard button with an onClick handler */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-white text-success bg-white shadow-sm px-3 py-2 rounded border fw-bold d-flex align-items-center gap-2"
        type="button"
      >
        Sort by: {sortLabels[activeSort] || "Latest"}
        <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`}></i>
      </button>

      {/* 3. We ONLY render the list if isOpen is true, and force it to show */}
      {isOpen && (
        <ul 
          className="dropdown-menu dropdown-menu-end shadow border mt-2"
          style={{ 
            display: "block", // Forces Tailwind/Bootstrap to show it
            position: "absolute", 
            right: 0, 
            top: "100%", 
            zIndex: 1050 
          }}
        >
          <li>
            <button 
              className={`dropdown-item small py-2 ${activeSort === 'created_at' ? 'active bg-success text-white' : ''}`}
              onClick={() => handleSortChange('created_at')}
              type="button"
            >
              Latest
            </button>
          </li>
          <li>
            <button 
              className={`dropdown-item small py-2 ${activeSort === 'price_asc' ? 'active bg-success text-white' : ''}`}
              onClick={() => handleSortChange('price_asc')}
              type="button"
            >
              Price: Low to High
            </button>
          </li>
          <li>
            <button 
              className={`dropdown-item small py-2 ${activeSort === 'price_desc' ? 'active bg-success text-white' : ''}`}
              onClick={() => handleSortChange('price_desc')}
              type="button"
            >
              Price: High to Low
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}