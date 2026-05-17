import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import "./template-style.css"
import Footer from "components/footer"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Add this line to load all the Eatsie icons! */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/icofont@1.0.0/dist/icofont.min.css" />
      </head>
      {/* Added the bg-light class from your template's <body> tag */}
      <body className="bg-light"> 
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
