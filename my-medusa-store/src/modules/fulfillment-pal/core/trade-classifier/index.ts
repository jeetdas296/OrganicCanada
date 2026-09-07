import { ShipmentContext, TradeDirection, TradeType } from "../../types"

export class TradeClassifier {
  private readonly defaultOperatingCountry: string

  constructor(defaultOperatingCountry: string = "CA") {
    this.defaultOperatingCountry = defaultOperatingCountry.toUpperCase()
  }

  public classify(context: ShipmentContext): ShipmentContext {
    const originCountry = context.origin.countryCode?.toUpperCase()
    const destinationCountry = context.destination.countryCode?.toUpperCase()

    if (!originCountry || !destinationCountry) {
      throw new Error("Cannot classify trade without origin and destination country codes")
    }

    let tradeType: TradeType
    let tradeDirection: TradeDirection

    if (originCountry === destinationCountry) {
      tradeType = "DOMESTIC"
      tradeDirection = "DOMESTIC"
    } else {
      tradeType = "CROSS_BORDER"
      
      // Determine direction relative to the operating country
      if (originCountry === this.defaultOperatingCountry) {
        tradeDirection = "EXPORT"
      } else if (destinationCountry === this.defaultOperatingCountry) {
        tradeDirection = "IMPORT"
      } else {
        // Fallback: If neither origin nor destination is the operating country, 
        // it's an export from the origin country's perspective.
        tradeDirection = "EXPORT"
      }
    }

    return {
      ...context,
      tradeType,
      tradeDirection,
    }
  }
}
