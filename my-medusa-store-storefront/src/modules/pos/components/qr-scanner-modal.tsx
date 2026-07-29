"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser"
import { BarcodeFormat, DecodeHintType } from "@zxing/library"
import { getVariantBySku } from "@lib/data/pos"
import { getVariantPrice } from "@lib/util/price-helper"

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddToCart: (item: any) => void
}

type ScanStatus =
  | { type: "idle"; message: string }
  | { type: "loading"; message: string }
  | { type: "success"; message: string; sku?: string }
  | { type: "out_of_stock"; message: string; sku?: string }
  | { type: "not_found"; message: string; sku?: string }
  | { type: "error"; message: string }

export default function QRScannerModal({
  isOpen,
  onClose,
  onAddToCart,
}: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  // Smart duplicate scan cooldown (Improvement #6)
  const lastScannedSkuRef = useRef<string>("")
  const lastScanTimestampRef = useRef<number>(0)
  const isProcessingRef = useRef<boolean>(false)

  const [status, setStatus] = useState<ScanStatus>({
    type: "idle",
    message: "Aim camera at a variant SKU QR code...",
  })

  const [countdown, setCountdown] = useState<number>(3)

  // Properly stop the camera tracks and zxing controls (Improvement #5)
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop()
      } catch (err) {
        console.error("Error stopping zxing controls:", err)
      }
      controlsRef.current = null
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => {
          track.stop()
        })
        videoRef.current.srcObject = null
      } catch (err) {
        console.error("Error stopping video stream tracks:", err)
      }
    }
  }, [])

  // Handle scanned SKU text
  const handleSkuScanned = useCallback(
    async (scannedText: string) => {
      const sku = scannedText.trim()
      if (!sku) return

      const now = Date.now()

      // Smart Duplicate Scan Handling: Ignore repeated scans of the SAME SKU within 1200ms cooldown,
      // while allowing different products to scan immediately
      if (
        lastScannedSkuRef.current === sku &&
        now - lastScanTimestampRef.current < 1200
      ) {
        return
      }

      if (isProcessingRef.current) return
      isProcessingRef.current = true

      lastScannedSkuRef.current = sku
      lastScanTimestampRef.current = now

      setStatus({
        type: "loading",
        message: `Looking up SKU: ${sku}...`,
      })

      try {
        const res = await getVariantBySku(sku)

        // Case: Variant Not Found
        if (!res.success || !res.variant) {
          setStatus({
            type: "not_found",
            message: `Product not found (Scanned SKU: ${sku})`,
            sku,
          })
          isProcessingRef.current = false
          return
        }

        const variant = res.variant
        const product = res.product || variant.product || {}

        // Validate inventory before adding to cart (Improvement #7)
        const inventoryQty =
          variant.inventory_quantity !== undefined &&
          variant.inventory_quantity !== null
            ? Number(variant.inventory_quantity)
            : 0

        if (inventoryQty <= 0) {
          setStatus({
            type: "out_of_stock",
            message: `Out of Stock: ${product.title || ""} ${
              variant.title !== "Default" ? "- " + variant.title : ""
            } (SKU: ${sku})`,
            sku,
          })
          isProcessingRef.current = false
          return
        }

        const { amount } = getVariantPrice(variant)

        const displayTitle =
          (product.title || "Product") +
          (variant.title && variant.title !== "Default"
            ? " - " + variant.title
            : "")

        // Support both synchronous and asynchronous onAddToCart implementations
        await Promise.resolve(
          onAddToCart({
            variant_id: variant.id,
            title: displayTitle,
            unit_price: amount,
            thumbnail: product.thumbnail || variant.thumbnail || null,
            sku: variant.sku,
          })
        )

        setStatus({
          type: "success",
          message: `${displayTitle} added in cart`,
          sku,
        })
      } catch (err: any) {
        console.error("[QRScanner] SKU lookup error:", err)
        setStatus({
          type: "error",
          message: `Error checking SKU (${sku}): ${err.message || "Unknown error"}`,
        })
      } finally {
        isProcessingRef.current = false
      }
    },
    [onAddToCart]
  )

  // Start continuous QR scanning with @zxing/browser (Improvement #4)
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      return
    }

    let isMounted = true

    setStatus({
      type: "idle",
      message: "Starting camera...",
    })

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])

    const codeReader = new BrowserMultiFormatReader(hints, 500)

    // Use rear camera preference on mobile with fallback to any camera
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }

    if (videoRef.current) {
      codeReader
        .decodeFromConstraints(
          constraints,
          videoRef.current,
          (result, error) => {
            if (!isMounted) return
            if (result) {
              const text = result.getText()
              if (text) {
                handleSkuScanned(text)
              }
            }
            // Normal frame without QR code emits undefined error or NotFoundException, which we ignore
          }
        )
        .then((controls) => {
          if (!isMounted) {
            controls.stop()
          } else {
            controlsRef.current = controls
            setStatus({
              type: "idle",
              message: "Aim camera at a variant SKU QR code...",
            })
          }
        })
        .catch((err) => {
          console.error("[QRScanner] Camera access error:", err)
          if (isMounted) {
            // Handle Camera Permission Denied or Not Found
            if (
              err.name === "NotAllowedError" ||
              err.name === "PermissionDeniedError"
            ) {
              setStatus({
                type: "error",
                message:
                  "Camera permission denied. Please enable camera permissions in browser settings.",
              })
            } else if (
              err.name === "NotFoundError" ||
              err.name === "DevicesNotFoundError"
            ) {
              setStatus({
                type: "error",
                message: "No camera device found on this system.",
              })
            } else {
              setStatus({
                type: "error",
                message: "Could not start camera: " + err.message,
              })
            }
          }
        })
    }

    return () => {
      isMounted = false
      stopCamera()
    }
  }, [isOpen, handleSkuScanned, stopCamera])

  // Popup countdown timer for success message
  useEffect(() => {
    if (status.type === "success") {
      setCountdown(3)
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            setStatus({
              type: "idle",
              message: "Aim camera at a variant SKU QR code...",
            })
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [status.type])

  if (!isOpen) return null

  const handleModalClose = () => {
    stopCamera()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            <h2 className="text-xl font-bold">POS QR Code Scanner</h2>
          </div>
          <button
            onClick={handleModalClose}
            className="text-white/80 hover:text-white text-2xl font-bold leading-none px-2"
            aria-label="Close scanner"
          >
            ×
          </button>
        </div>

        {/* Video Scanner Area */}
        <div className="relative bg-black w-full aspect-video flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Aiming Overlay Frame */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 border-2 border-white/70 rounded-2xl relative">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
            </div>
          </div>

          {/* Prominent Popup Timer Message Overlay on Camera */}
          {status.type === "success" && (
            <div className="absolute top-4 inset-x-4 z-30 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-gradient-to-r from-green-600/95 to-emerald-700/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl border border-white/20 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <span className="font-bold text-sm tracking-wide">
                      {status.message}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/25 px-2.5 py-1 rounded-full text-xs font-mono font-semibold whitespace-nowrap">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-300 animate-ping" />
                    <span>Closing in {countdown}s</span>
                  </div>
                </div>
                {/* Visual countdown progress bar */}
                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Status & Feedback Bar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
          {status.type === "idle" && (
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span>{status.message}</span>
            </div>
          )}

          {status.type === "loading" && (
            <div className="flex items-center gap-2 text-blue-700 text-sm font-semibold">
              <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>{status.message}</span>
            </div>
          )}

          {status.type === "success" && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-semibold animate-in fade-in duration-150">
              <span>✅ {status.message}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                  Auto-dismiss in {countdown}s
                </span>
                <span className="text-xs bg-green-200 text-green-900 px-2 py-0.5 rounded font-mono">
                  {status.sku}
                </span>
              </div>
            </div>
          )}

          {status.type === "out_of_stock" && (
            <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm font-semibold animate-in fade-in duration-150">
              <span>⚠️ {status.message}</span>
              <span className="text-xs bg-orange-200 text-orange-900 px-2 py-0.5 rounded font-mono">
                {status.sku}
              </span>
            </div>
          )}

          {status.type === "not_found" && (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm font-semibold animate-in fade-in duration-150">
              <span>❌ {status.message}</span>
              <span className="text-xs bg-red-200 text-red-900 px-2 py-0.5 rounded font-mono">
                {status.sku}
              </span>
            </div>
          )}

          {status.type === "error" && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm font-medium">
              {status.message}
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Scanner remains active to scan multiple items.
            </span>
            <button
              onClick={handleModalClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm rounded-lg transition-colors"
            >
              Close Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
