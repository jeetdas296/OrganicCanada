import { Metadata } from "next"
import { notFound } from "next/navigation"
import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "@lib/data/cookies"
import Link from "next/link"
export const metadata: Metadata = {
    title: "B2B Quotes",
    description: "Overview of your B2B Quotes and negotiations.",
}
// Fetch quotes from our custom API
async function listB2BQuotes() {
    const headers = await getAuthHeaders()
    const next = await getCacheOptions("quotes")
    try {
        return await sdk.client
            .fetch<any>(`/store/b2b-quotes`, {
                method: "GET",
                headers,
                next,
                cache: "no-store", // Ensure fresh data for negotiations
            })
            .then((res) => res.quotes)
    } catch (e) {
        return null
    }
}
export default async function Quotes(props: { params: Promise<{ countryCode: string }> }) {
    const params = await props.params;
    const countryCode = params.countryCode;
    const quotes = await listB2BQuotes()
    console.log(quotes);
    if (!quotes) {
        // If auth fails or endpoint missing, fallback
        return (
            <div className="w-full">
                <h1 className="text-2xl-semi mb-4">B2B Quotes</h1>
                <p>Failed to load quotes.</p>
            </div>
        )
    }

    // Sort quotes by latest first
    quotes.sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="w-full min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8" data-testid="quotes-page-wrapper">
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight sm:text-5xl mb-4">
                        B2B Wholesale Quotes
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                        Manage your pending quotes, active negotiations, and approve custom offers tailored exclusively for your business.
                    </p>
                </div>
                <div className="mt-12">
                    {quotes.length === 0 ? (
                        <div className="flex flex-col gap-y-4 bg-white/70 backdrop-blur-lg border border-gray-100 shadow-xl p-12 rounded-2xl items-center text-center">
                            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <span className="text-2xl">📦</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-800">No Quotes Available</h3>
                            <p className="text-gray-500">You don't have any active B2B Quotes yet. Build a cart and request a quote to get started.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-y-6">
                            {quotes.map((quote: any) => {
                                const isConverted = quote.metadata.quote_status === "completed" || quote.status === "ordered" || quote.status === "requires_action"
                                return (
                                    <div
                                        key={quote.id}
                                        className="bg-white/80 backdrop-blur-xl border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-300 p-6 sm:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-y-6 transform hover:-translate-y-1"
                                    >
                                        <div className="flex flex-col gap-y-3 w-full md:w-2/3">
                                            <div className="flex items-center gap-x-3">
                                                <h3 className="font-bold text-2xl text-gray-900">
                                                    Quote <span className="text-gray-400 font-medium">#{quote.id.split('_')[1] || quote.id}</span>
                                                </h3>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm tracking-wide uppercase ${isConverted ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" : "bg-gradient-to-r from-gray-800 to-gray-700 text-white"
                                                    }`}>
                                                    {isConverted ? "Ordered" : (quote.metadata.quote_status || "Pending")}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm font-medium">
                                                Initiated on {new Date(quote.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col md:items-end w-full md:w-1/3 space-y-4">
                                            <p className="font-extrabold text-3xl text-gray-900">
                                                ${(quote.total || 0).toFixed(2)} <span className="text-lg text-gray-400 font-medium">{quote.currency_code?.toUpperCase()}</span>
                                            </p>
                                            <Link href={`/${countryCode}/b2b-quotes/${quote.id}`}>
                                                <button className="bg-gradient-to-r from-gray-900 to-black text-white px-6 py-3 rounded-full font-semibold shadow-md hover:shadow-xl transition-all hover:scale-105">
                                                    View Details
                                                </button>
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}