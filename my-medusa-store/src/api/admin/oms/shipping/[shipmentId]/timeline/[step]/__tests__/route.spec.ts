import { POST } from "../route"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

describe("Timeline Step Completion Route", () => {
  let req: Partial<MedusaRequest>
  let res: Partial<MedusaResponse>
  let jsonMock: jest.Mock
  let statusMock: jest.Mock
  let queryMock: jest.Mock

  beforeEach(() => {
    jsonMock = jest.fn()
    statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    
    req = {
      params: { shipmentId: "shp_123", step: "CUSTOMS_PREPARATION" },
      body: {},
      scope: {
        resolve: (key: string) => {
          if (key === "query") {
            return { graph: queryMock }
          }
          if (key === "fulfillmentModuleService") {
            return {
              listFulfillments: jest.fn().mockResolvedValue([{
                id: "ful_b", items: [{ line_item_id: "item_b" }]
              }])
            }
          }
          if (key === "fulfillment_pal") {
            return {
              updatePalShipmentTimelineSteps: jest.fn()
            }
          }
        }
      }
    } as any

    res = {
      status: statusMock,
      json: jsonMock
    }
  })

  it("1. Missing HS Code throws MISSING_HS_CODE", async () => {
    req.body = {
      country_of_origin: "US",
      declared_value: 100,
      currency: "USD",
      incoterm: "DDP",
      customs_reference: "REF123",
      preparation_date: "2023-01-01",
      prepared_by: "Vendor"
    }

    // Mock graph query to return a shipment with a timeline
    queryMock = jest.fn().mockResolvedValue({
      data: [{
        id: "shp_123",
        order_id: "ord_123",
        order_type: "B2C",
        trade_classifier: "CROSS_BORDER",
        timelines: [{
          steps: [
            { id: "step_1", step_code: "CUSTOMS_PREPARATION", status: "AVAILABLE", step_order: 1 }
          ]
        }]
      }]
    })

    await POST(req as MedusaRequest, res as MedusaResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({
      code: "MISSING_HS_CODE",
      message: "Missing required field: hs_code"
    })
  })

  it("2. Missing Incoterm throws MISSING_INCOTERM", async () => {
    req.body = {
      hs_code: "1234.56.78",
      country_of_origin: "US",
      declared_value: 100,
      currency: "USD",
      customs_reference: "REF123",
      preparation_date: "2023-01-01",
      prepared_by: "Vendor"
    }

    queryMock = jest.fn().mockResolvedValue({
      data: [{
        id: "shp_123",
        order_id: "ord_123",
        order_type: "B2C",
        trade_classifier: "CROSS_BORDER",
        timelines: [{
          steps: [
            { id: "step_1", step_code: "CUSTOMS_PREPARATION", status: "AVAILABLE", step_order: 1 }
          ]
        }]
      }]
    })

    await POST(req as MedusaRequest, res as MedusaResponse)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({
      code: "MISSING_INCOTERM",
      message: "Missing required field: incoterm"
    })
  })
  it("3. Rejects unauthorized vendor based on fulfillment items", async () => {
    (req as any).auth_context = { actor_id: "user_vendorA" }
    req.body = {
      hs_code: "1234.56.78",
      country_of_origin: "US",
      declared_value: 100,
      currency: "USD",
      incoterm: "DDP",
      customs_reference: "REF123",
      preparation_date: "2023-01-01",
      prepared_by: "Vendor A"
    }

    queryMock = jest.fn().mockImplementation(async ({ entity }: any) => {
      if (entity === "user") {
        return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      }
      if (entity === "pal_shipment") {
        return {
          data: [{
            id: "shp_123",
            order_id: "ord_123",
            external_reference: "ful_b",
            order_type: "B2C",
            trade_classifier: "CROSS_BORDER",
            timelines: [{
              steps: [
                { id: "step_1", step_code: "CUSTOMS_PREPARATION", status: "AVAILABLE", step_order: 1 }
              ]
            }]
          }]
        }
      }
      if (entity === "order") {
        return {
          data: [{
            id: "ord_123",
            items: [
              { id: "item_a", variant: { product: { vendor: { id: "vendorA" } } } },
              { id: "item_b", variant: { product: { vendor: { id: "vendorB" } } } }
            ]
          }]
        }
      }
      return { data: [] }
    })

    await POST(req as MedusaRequest, res as MedusaResponse)

    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({
      message: "Unauthorized"
    })
  })
})
