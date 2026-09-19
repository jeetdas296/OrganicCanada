import { CarrierConnectionStatus } from "./types"

export const organicCanadaConfig = {
  enabled: process.env.PAL_ORGANIC_CANADA_ENABLED !== "false",
  priority: Number(process.env.PAL_ORGANIC_CANADA_PRIORITY || "1"),
  carriers: {
    easyship: {
      status: (process.env.PAL_EASYSHIP_STATUS || "NOT_CONFIGURED") as CarrierConnectionStatus,
    },
    dhl: {
      status: (process.env.PAL_DHL_STATUS || "NOT_CONFIGURED") as CarrierConnectionStatus,
    },
    fedex: {
      status: (process.env.PAL_FEDEX_STATUS || "NOT_CONFIGURED") as CarrierConnectionStatus,
    },
    ups: {
      status: (process.env.PAL_UPS_STATUS || "NOT_CONFIGURED") as CarrierConnectionStatus,
    },
    shipstation: {
      status: (process.env.PAL_SHIPSTATION_STATUS || "NOT_CONFIGURED") as CarrierConnectionStatus,
    },
    shiprocket: {
      status: (process.env.PAL_SHIPROCKET_STATUS || "NOT_CONFIGURED") as CarrierConnectionStatus,
    }
  }
}
