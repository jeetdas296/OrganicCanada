import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct, AdminProductVariant } from "@medusajs/types"
import { Container, Heading, Button, Badge, Text, IconButton } from "@medusajs/ui"
import { SquaresPlus, ArrowDownTray } from "@medusajs/icons"
import { useState, useEffect, useCallback } from "react"
import QRCode from "qrcode"

const VariantQRGeneratorWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [variants, setVariants] = useState<AdminProductVariant[]>(product.variants || [])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<AdminProductVariant | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)

  const loadVariants = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/admin/products/${product.id}?fields=*variants,*variants.options`)
      if (response.ok) {
        const data = await response.json()
        if (data.product?.variants) {
          setVariants(data.product.variants)
        }
      }
    } catch (err) {
      console.error("Failed to load variants for QR generator:", err)
    } finally {
      setIsLoading(false)
    }
  }, [product.id])

  useEffect(() => {
    loadVariants()
  }, [loadVariants])

  // Automatically generate QR code when selectedVariant changes
  useEffect(() => {
    if (!selectedVariant?.sku) {
      setQrDataUrl("")
      return
    }
    let isMounted = true
    setIsGeneratingQr(true)

    QRCode.toDataURL(selectedVariant.sku, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url)
          setIsGeneratingQr(false)
        }
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err)
        if (isMounted) setIsGeneratingQr(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedVariant])

  const handleDownload = () => {
    if (!qrDataUrl || !selectedVariant?.sku) return
    const link = document.createElement("a")
    link.href = qrDataUrl
    link.download = `QR-${selectedVariant.sku}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    if (!qrDataUrl || !selectedVariant?.sku) return
    const printWindow = window.open("", "_blank", "width=600,height=700")
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Label - ${selectedVariant.sku}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              text-align: center;
              box-sizing: border-box;
              background: #fff;
            }
            .label-card {
              border: 2px solid #111827;
              border-radius: 12px;
              padding: 28px 24px;
              max-width: 340px;
              width: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .product-name {
              font-size: 20px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 6px;
              line-height: 1.3;
            }
            .variant-name {
              font-size: 15px;
              color: #4b5563;
              margin-bottom: 16px;
              font-weight: 500;
            }
            .sku-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .sku-value {
              font-size: 18px;
              font-weight: 700;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              color: #111827;
              margin-bottom: 18px;
            }
            .qr-image {
              width: 240px;
              height: 240px;
              display: block;
              margin: 0 auto;
            }
            @media print {
              body {
                padding: 0;
              }
              .label-card {
                border: 1px solid #000;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="product-name">${product.title || ""}</div>
            <div class="variant-name">${selectedVariant.title || ""}</div>
            <div class="sku-label">SKU</div>
            <div class="sku-value">${selectedVariant.sku}</div>
            <img class="qr-image" src="${qrDataUrl}" alt="QR Code ${selectedVariant.sku}" />
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 150);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <SquaresPlus />
          <Heading level="h2">Variant QR Codes (POS Scanner)</Heading>
          <Badge color="blue" size="small">
            SKU Based
          </Badge>
        </div>
      </div>

      {/* Variants List */}
      <div className="px-6 py-4 space-y-3">
        {variants.length === 0 && !isLoading && (
          <Text className="text-ui-fg-muted text-sm">No variants found for this product.</Text>
        )}

        {variants.map((variant) => {
          const hasSku = Boolean(variant.sku && variant.sku.trim().length > 0)

          return (
            <div
              key={variant.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 border border-ui-border-base rounded-lg p-3.5 bg-ui-bg-subtle hover:bg-ui-bg-base transition-colors"
            >
              <div>
                <div className="flex items-center gap-x-2">
                  <Text size="small" weight="plus">
                    {variant.title}
                  </Text>
                  {hasSku ? (
                    <Badge color="green" size="2xsmall">
                      SKU: {variant.sku}
                    </Badge>
                  ) : (
                    <Badge color="orange" size="2xsmall">
                      No SKU
                    </Badge>
                  )}
                </div>
                {!hasSku && (
                  <Text size="xsmall" className="text-ui-fg-error mt-1">
                    Variant has no SKU. QR Code cannot be generated. The merchant can later add a SKU.
                  </Text>
                )}
              </div>

              <div className="flex items-center gap-x-2">
                {hasSku && (
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => setSelectedVariant(variant)}
                  >
                    QR Code
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Auto-Generating QR Code Modal */}
      {selectedVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-ui-bg-base border border-ui-border-base rounded-xl shadow-xl max-w-sm w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-ui-border-base pb-3">
              <Heading level="h3">Variant QR Code</Heading>
              <button
                type="button"
                className="text-ui-fg-muted hover:text-ui-fg-base text-lg font-bold"
                onClick={() => {
                  setSelectedVariant(null)
                  setQrDataUrl("")
                }}
              >
                ✕
              </button>
            </div>

            {/* Product & Variant Details */}
            <div className="text-center space-y-1">
              <Text weight="plus" className="text-ui-fg-base text-base">
                {product.title}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                {selectedVariant.title}
              </Text>
              <div className="pt-2">
                <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wider">
                  SKU
                </Text>
                <div className="text-lg font-mono font-bold text-ui-fg-base mt-0.5">
                  {selectedVariant.sku}
                </div>
              </div>
            </div>

            {/* QR Code Preview */}
            <div className="flex items-center justify-center py-2">
              {isGeneratingQr || !qrDataUrl ? (
                <div className="w-64 h-64 flex items-center justify-center border border-ui-border-base rounded-lg bg-ui-bg-subtle text-ui-fg-muted text-sm">
                  Generating QR...
                </div>
              ) : (
                <div className="border-2 border-ui-border-base rounded-xl p-3 bg-white shadow-sm">
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for SKU ${selectedVariant.sku}`}
                    className="w-60 h-60 object-contain block mx-auto"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions (Only Download & Print as requested) */}
            <div className="flex items-center gap-x-2 pt-2 border-t border-ui-border-base">
              <Button
                variant="secondary"
                size="small"
                className="flex-1"
                onClick={handleDownload}
                disabled={!qrDataUrl || isGeneratingQr}
              >
                <ArrowDownTray className="mr-1.5" />
                Download
              </Button>
              <Button
                variant="primary"
                size="small"
                className="flex-1"
                onClick={handlePrint}
                disabled={!qrDataUrl || isGeneratingQr}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default VariantQRGeneratorWidget
