import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Text, Button, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useVendorSidebar } from "../../../hooks/useVendorSidebar"

const CreateDigitalProduct = () => {
  useVendorSidebar()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const [currencies, setCurrencies] = useState<any[]>([])
  
  // 🟢 NEW: State for storing multiple prices (e.g., { usd: "25", eur: "22" })
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [title, setTitle] = useState("")

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await fetch("/admin/stores")
        const data = await res.json()
        const store = data.stores?.[0]
        
        if (store && store.supported_currencies) {
          setCurrencies(store.supported_currencies)
          
          // 🟢 Initialize empty price boxes for every currency
          const initialPrices: Record<string, string> = {}
          store.supported_currencies.forEach((c: any) => {
            initialPrices[c.currency_code] = ""
          })
          setPrices(initialPrices)
        }
      } catch (err) {
        console.error("Failed to load currencies:", err)
      }
    }
    fetchCurrencies()
  }, [])

  // Handle updating a specific currency box
  const handlePriceChange = (currencyCode: string, value: string) => {
    setPrices(prev => ({
      ...prev,
      [currencyCode]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      toast.error("Please select a file to upload.")
      return
    }

    setLoading(true)

    try {
      const fileFormData = new FormData()
      fileFormData.append("files", file)

      const uploadRes = await fetch("/admin/uploads", {
        method: "POST",
        body: fileFormData,
      })

      if (!uploadRes.ok) throw new Error("Failed to upload the digital file.")
      
      const uploadData = await uploadRes.json()
      const finalFileUrl = uploadData.files[0].url

      const res = await fetch("/admin/digital-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          prices: prices,
          file_url: finalFileUrl,
          file_name: file.name
        })
      })

      // 🟢 1. Parse the JSON response so we can get the new Product ID
      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.message || "Failed to save product to the database.")
      }

      toast.success("Digital Product published securely!")
      
      // 🟢 2. Navigate exactly to the new product's page! 
      // (Medusa's router automatically handles the /app prefix)
      navigate(`/products/${responseData.product.id}`) 

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="p-8 max-w-2xl mx-auto mt-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-md"><DocumentText /></div>
        <Heading level="h1" className="text-2xl">Add Digital Product</Heading>
      </div>
      
      <Text className="text-ui-fg-subtle mb-8">
        Upload a file (e.g., PDF, eBook). Pricing must be set for all regions to ensure a seamless storefront experience.
      </Text>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <label className="block text-sm font-medium mb-2">Product Title</label>
          <input 
            type="text" required
            className="w-full p-2 border rounded-md bg-ui-bg-base focus:ring-black focus:border-black"
            placeholder="e.g., Beekeeper's PDF Guide"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 🟢 DYNAMIC PRICING GRID */}
        <div className="p-4 border rounded-lg bg-ui-bg-subtle">
          <Heading level="h2" className="text-lg mb-4">Global Pricing Configuration</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currencies.map((c) => (
              <div key={c.currency_code}>
                <label className="block text-sm font-medium mb-1">
                  Price in {c.currency.name} ({c.currency.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-ui-fg-muted">{c.currency.symbol}</span>
                  <input 
                    type="number" required step="0.01" min="0"
                    className="w-full pl-8 p-2 border rounded-md bg-ui-bg-base focus:ring-black focus:border-black"
                    placeholder="0.00"
                    value={prices[c.currency_code] || ""}
                    onChange={(e) => handlePriceChange(c.currency_code, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Digital Asset File</label>
          <div className="p-8 border-2 border-dashed rounded-lg text-center bg-ui-bg-subtle hover:bg-ui-bg-base transition-colors">
            <input 
              type="file" required
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="block w-full text-sm text-ui-fg-subtle file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {file && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md inline-block">
                <Text size="small" className="text-green-800 font-medium">Ready: {file.name}</Text>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button variant="primary" type="submit" isLoading={loading} className="w-full h-10">
            Upload & Publish Digital Product
          </Button>
        </div>

      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Add Digital Product",
  icon: DocumentText,
})

export default CreateDigitalProduct