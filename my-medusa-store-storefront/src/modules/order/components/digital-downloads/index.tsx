"use client"

import { CloudDownload, FileText, ShieldCheck, Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { fetchDigitalDownloads, type DownloadItem } from "@lib/data/digital-downloads"

type DigitalDownloadsWidgetProps = {
  orderId?: string
  order?: { id: string }
}

const DigitalDownloadsWidget: React.FC<DigitalDownloadsWidgetProps> = ({
  orderId,
  order,
}) => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [loading, setLoading] = useState(true)

  const resolvedOrderId = orderId || order?.id

  useEffect(() => {
    if (!resolvedOrderId) {
      setLoading(false)
      return
    }

    fetchDigitalDownloads(resolvedOrderId)
      .then(setDownloads)
      .catch(() => setDownloads([]))
      .finally(() => setLoading(false))
  }, [resolvedOrderId])

  const formatAbsoluteUrl = (url: string) => {
    if (url.startsWith("http")) return url
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    return `${backendUrl}${url.startsWith("/") ? "" : "/"}${url}`
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm font-medium animate-pulse border border-dashed rounded-2xl bg-slate-50">
        Verifying secure digital entitlements...
      </div>
    )
  }

  if (downloads.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="digital-downloads-heading"
      className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 shadow-sm sm:p-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl"
      />

      <div className="relative flex flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <CloudDownload className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                Instant Access
              </p>
              <h2
                id="digital-downloads-heading"
                className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl"
              >
                Your Digital Downloads
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Your files are ready. Save a copy to your device — links stay active on your account.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-emerald-800 backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure download
          </div>
        </header>

        <ul className="relative flex flex-col divide-y divide-slate-200/70 overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur">
          {downloads.map((item, index) => {
            return (
              <li
                key={index}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                      {item.item_title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item.file_name}
                    </p>
                  </div>
                </div>

                <a
                  href={formatAbsoluteUrl(item.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={item.file_name}
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <CloudDownload className="h-4 w-4 transition group-hover:-translate-y-0.5" />
                  Download File
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default DigitalDownloadsWidget