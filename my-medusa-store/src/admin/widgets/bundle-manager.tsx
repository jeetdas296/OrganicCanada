import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/types"
import { Container, Heading, Button, Input, Badge, IconButton, Text, Textarea } from "@medusajs/ui"
import { PlusMini, Trash, MagnifyingGlass, SquaresPlus } from "@medusajs/icons"
import { useState, useEffect, useCallback } from "react"

type BundleItem = {
  product_id: string
  quantity: number
  title?: string
  thumbnail?: string
}

type BundleData = {
  id: string
  title: string
  description: string | null
  items: Array<{
    id: string
    product_id: string
    quantity: number
  }>
}

type SearchResult = {
  id: string
  title: string
  thumbnail: string | null
}

const BundleManagerWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  // ─── State ──────────────────────────────────────────────
  const [isBundle, setIsBundle] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [bundleData, setBundleData] = useState<BundleData | null>(null)
  const [bundleTitle, setBundleTitle] = useState("")
  const [bundleDescription, setBundleDescription] = useState("")
  const [componentItems, setComponentItems] = useState<BundleItem[]>([])

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  // Status messages
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // ─── Load existing bundle data ──────────────────────────
  const loadBundleData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/admin/bundles?product_id=${product.id}`)
      const data = await response.json()

      if (data.is_bundle && data.bundle) {
        setIsBundle(true)
        setBundleData(data.bundle)
        setBundleTitle(data.bundle.title)
        setBundleDescription(data.bundle.description || "")

        // Load component product details for display
        const items = data.bundle.items || []
        const enrichedItems: BundleItem[] = []

        for (const item of items) {
          try {
            const prodResponse = await fetch(`/admin/products/${item.product_id}`)
            const prodData = await prodResponse.json()
            enrichedItems.push({
              product_id: item.product_id,
              quantity: item.quantity,
              title: prodData.product?.title || "Unknown Product",
              thumbnail: prodData.product?.thumbnail || null,
            })
          } catch {
            enrichedItems.push({
              product_id: item.product_id,
              quantity: item.quantity,
              title: "Unknown Product",
            })
          }
        }

        setComponentItems(enrichedItems)
      } else {
        setIsBundle(false)
      }
    } catch (error) {
      console.error("Failed to load bundle data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [product.id])

  useEffect(() => {
    loadBundleData()
  }, [loadBundleData])

  // ─── Search for products ────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/admin/products?q=${encodeURIComponent(searchQuery)}&limit=10`)
      const data = await response.json()

      // Filter out the current product and already-added components
      const existingIds = componentItems.map(c => c.product_id)
      const filtered = (data.products || []).filter(
        (p: any) => p.id !== product.id && !existingIds.includes(p.id)
      )

      setSearchResults(filtered.map((p: any) => ({
        id: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
      })))
    } catch (error) {
      console.error("Product search failed:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // ─── Add a component product ────────────────────────────
  const addComponent = (result: SearchResult) => {
    setComponentItems(prev => [
      ...prev,
      {
        product_id: result.id,
        quantity: 1,
        title: result.title,
        thumbnail: result.thumbnail || undefined,
      },
    ])
    // Remove from search results
    setSearchResults(prev => prev.filter(r => r.id !== result.id))
  }

  // ─── Remove a component product ─────────────────────────
  const removeComponent = (productId: string) => {
    setComponentItems(prev => prev.filter(c => c.product_id !== productId))
  }

  // ─── Update component quantity ──────────────────────────
  const updateQuantity = (productId: string, quantity: number) => {
    setComponentItems(prev =>
      prev.map(c =>
        c.product_id === productId ? { ...c, quantity: Math.max(1, quantity) } : c
      )
    )
  }

  // ─── Save the bundle ────────────────────────────────────
  const handleSave = async () => {
    if (!bundleTitle.trim()) {
      setStatusMessage({ type: "error", text: "Bundle title is required." })
      return
    }

    setIsSaving(true)
    setStatusMessage(null)

    try {
      const response = await fetch("/admin/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          title: bundleTitle,
          description: bundleDescription || null,
          items: componentItems.map(c => ({
            product_id: c.product_id,
            quantity: c.quantity,
          })),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatusMessage({ type: "success", text: "✅ Bundle saved successfully!" })
        setIsBundle(true)
        setBundleData(data.bundle)
        // Re-load to get fresh data
        await loadBundleData()
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to save bundle." })
      }
    } catch (error) {
      setStatusMessage({ type: "error", text: "Network error while saving bundle." })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Delete the bundle ──────────────────────────────────
  const handleDelete = async () => {
    if (!bundleData?.id) return

    if (!window.confirm("Are you sure you want to remove the bundle from this product?")) return

    setIsSaving(true)
    try {
      await fetch(`/admin/bundles/${bundleData.id}`, { method: "DELETE" })
      setIsBundle(false)
      setBundleData(null)
      setBundleTitle("")
      setBundleDescription("")
      setComponentItems([])
      setStatusMessage({ type: "success", text: "Bundle removed from this product." })
    } catch (error) {
      setStatusMessage({ type: "error", text: "Failed to delete bundle." })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Mark as Bundle (first time) ────────────────────────
  const handleMarkAsBundle = () => {
    setIsBundle(true)
    setBundleTitle(`${product.title} Bundle`)
    setBundleDescription("")
    setComponentItems([])
    setShowSearch(true)
  }

  // ─── Render ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center gap-x-3 px-6 py-4">
          <SquaresPlus />
          <Heading level="h2">Bundle Manager</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted">Loading bundle data...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <SquaresPlus />
          <Heading level="h2">Bundle Manager</Heading>
          {isBundle && <Badge color="purple">Bundle</Badge>}
        </div>
        {isBundle && bundleData && (
          <Button variant="danger" size="small" onClick={handleDelete} disabled={isSaving}>
            Remove Bundle
          </Button>
        )}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`px-6 py-3 text-sm ${statusMessage.type === "success" ? "bg-ui-bg-subtle text-ui-fg-interactive" : "bg-ui-bg-subtle text-ui-fg-error"
          }`}>
          {statusMessage.text}
        </div>
      )}

      {/* Not a bundle yet */}
      {!isBundle && (
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-muted mb-4">
            This product is not configured as a bundle.
          </Text>
          <div className="mt-4">
            <Button variant="secondary" onClick={handleMarkAsBundle}>
              <PlusMini />
              Mark as Bundle
            </Button>
          </div>
        </div>
      )}

      {/* Bundle Configuration */}
      {isBundle && (
        <>
          {/* Bundle Info */}
          <div className="px-6 py-4 space-y-3">
            <div>
              <Text size="small" weight="plus" className="mb-1">Bundle Title</Text>
              <Input
                placeholder="e.g., Holiday Gift Bundle"
                value={bundleTitle}
                onChange={(e) => setBundleTitle(e.target.value)}
              />
            </div>
            <div>
              <Text size="small" weight="plus" className="mb-1">Description (optional)</Text>
              <Textarea
                placeholder="Describe what's included in this bundle..."
                value={bundleDescription}
                onChange={(e) => setBundleDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Component Products List */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <Text size="small" weight="plus">
                Component Products ({componentItems.length})
              </Text>
              <Button variant="secondary" size="small" onClick={() => setShowSearch(!showSearch)}>
                <PlusMini />
                Add Product
              </Button>
            </div>

            {componentItems.length === 0 && (
              <div className="border border-dashed border-ui-border-strong rounded-lg py-6 text-center">
                <Text className="text-ui-fg-muted">
                  No components added yet. Search for products to add to this bundle.
                </Text>
              </div>
            )}

            {componentItems.length > 0 && (
              <div className="space-y-2">
                {componentItems.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center gap-x-3 border border-ui-border-base rounded-lg p-3"
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-md bg-ui-bg-subtle overflow-hidden flex-shrink-0">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ui-fg-muted">
                          <SquaresPlus />
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div className="flex-grow min-w-0">
                      <Text size="small" weight="plus" className="truncate">{item.title}</Text>
                      <Text size="xsmall" className="text-ui-fg-muted">{item.product_id}</Text>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-x-1 flex-shrink-0">
                      <Text size="xsmall" className="text-ui-fg-muted mr-1">Qty:</Text>
                      <button
                        className="w-6 h-6 rounded border border-ui-border-base flex items-center justify-center text-sm hover:bg-ui-bg-subtle"
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        className="w-6 h-6 rounded border border-ui-border-base flex items-center justify-center text-sm hover:bg-ui-bg-subtle"
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>

                    {/* Remove */}
                    <IconButton variant="transparent" size="small" onClick={() => removeComponent(item.product_id)}>
                      <Trash />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Search Panel */}
          {showSearch && (
            <div className="px-6 py-4 bg-ui-bg-subtle">
              <Text size="small" weight="plus" className="mb-2">Search Products</Text>
              <div className="flex gap-x-2 mb-3">
                <Input
                  placeholder="Search by product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button variant="secondary" onClick={handleSearch} disabled={isSearching}>
                  <MagnifyingGlass />
                  {isSearching ? "..." : "Search"}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center gap-x-3 p-2 rounded-md hover:bg-ui-bg-base cursor-pointer transition-colors"
                      onClick={() => addComponent(result)}
                    >
                      <div className="w-8 h-8 rounded bg-ui-bg-base overflow-hidden flex-shrink-0">
                        {result.thumbnail ? (
                          <img src={result.thumbnail} alt={result.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ui-fg-muted">
                            <SquaresPlus />
                          </div>
                        )}
                      </div>
                      <Text size="small">{result.title}</Text>
                      <div className="ml-auto">
                        <Badge color="green" size="2xsmall">+ Add</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.length === 0 && searchQuery && !isSearching && (
                <Text size="small" className="text-ui-fg-muted">
                  No matching products found. Try a different search term.
                </Text>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="px-6 py-4 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} isLoading={isSaving}>
              {bundleData ? "Update Bundle" : "Create Bundle"}
            </Button>
          </div>
        </>
      )}
    </Container>
  )
}

// Mount on the Product Details page
export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default BundleManagerWidget