import { GET } from "../route"

describe("OMS Shipping Route", () => {
  let mockReq: any
  let mockRes: any
  let mockQuery: any

  beforeEach(() => {
    mockQuery = {
      graph: jest.fn()
    }

    mockReq = {
      scope: {
        resolve: jest.fn((key) => {
          if (key === "query") return mockQuery
          return {}
        })
      },
      auth_context: {
        actor_id: null
      }
    }

    mockRes = {
      json: jest.fn()
    }
  })

  it("returns shipments ordered by created_at DESC then id DESC for admin, with correct price, qty, and products", async () => {
    const listFulfillmentsMock = jest.fn().mockResolvedValue([
      { id: "ful_1", items: [{ line_item_id: "item_1" }] },
      { id: "ful_2", items: [{ line_item_id: "item_2" }] },
      { id: "ful_3", items: [{ line_item_id: "item_3" }] }
    ])

    mockReq.scope.resolve = jest.fn((key) => {
      if (key === "query") return mockQuery
      if (key === "fulfillment") return { listFulfillments: listFulfillmentsMock }
      return {}
    })

    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "pal_shipment") {
        return {
          data: [
            { id: "ship_1", order_id: "ord_1", external_reference: "ful_1", created_at: "2026-08-24T10:00:00.000Z", status: "CREATED" },
            { id: "ship_2", order_id: "ord_2", external_reference: "ful_2", created_at: "2026-08-24T12:00:00.000Z", status: "CREATED" },
            { id: "ship_3", order_id: "ord_3", external_reference: "ful_3", created_at: "2026-08-24T12:00:00.000Z", status: "CREATED" }
          ]
        }
      }
      if (entity === "pal_provider_booking") return { data: [] }
      if (entity === "order") {
        return {
          data: [
            { id: "ord_1", items: [{ id: "item_1", title: "Prod A", quantity: 2, unit_price: 15 }] },
            { id: "ord_2", items: [{ id: "item_2", title: "Prod B", quantity: 1, unit_price: 10 }] },
            { id: "ord_3", items: [{ id: "item_3", title: "Prod C", quantity: 3, unit_price: 5 }] }
          ]
        }
      }
      return { data: [] }
    })

    await GET(mockReq, mockRes)
    
    expect(mockRes.json).toHaveBeenCalled()
    const { shipments } = mockRes.json.mock.calls[0][0]
    
    // Sort logic should place ship_2/ship_3 before ship_1. 
    // And between ship_2 and ship_3, ship_3 comes before ship_2 due to id DESC
    expect(shipments.length).toBe(3)
    expect(shipments[0].id).toBe("ship_3")
    expect(shipments[0].price).toBe(15) // 3 * 5
    expect(shipments[0].quantity).toBe(3)
    expect(shipments[0].products).toBe("Prod C")

    expect(shipments[1].id).toBe("ship_2")
    expect(shipments[1].price).toBe(10) // 1 * 10
    expect(shipments[1].quantity).toBe(1)
    
    expect(shipments[2].id).toBe("ship_1")
    expect(shipments[2].price).toBe(30) // 2 * 15
    expect(shipments[2].quantity).toBe(2)
  })

  it("filters items by vendor based on the actual fulfillment items", async () => {
    mockReq.auth_context.actor_id = "user_vendorA"
    
    const listFulfillmentsMock = jest.fn().mockResolvedValue([
      { id: "ful_a", items: [{ line_item_id: "item_a" }] },
      { id: "ful_b", items: [{ line_item_id: "item_b" }] }
    ])

    mockReq.scope.resolve = jest.fn((key) => {
      if (key === "query") return mockQuery
      if (key === "fulfillment") return { listFulfillments: listFulfillmentsMock }
      return {}
    })

    // Setup query to return a vendor A user
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "user") {
        return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      }
      if (entity === "pal_shipment") {
        return {
          data: [
            // Vendor A's shipment for Vendor A's item
            { id: "ship_a", order_id: "ord_mix", external_reference: "ful_a", created_at: "2026-08-24T10:00:00.000Z", status: "CREATED" },
            // Vendor B's shipment for Vendor B's item in the SAME order
            { id: "ship_b", order_id: "ord_mix", external_reference: "ful_b", created_at: "2026-08-24T12:00:00.000Z", status: "CREATED" }
          ]
        }
      }
      if (entity === "pal_provider_booking") return { data: [] }
      if (entity === "order") {
        return {
          data: [
            { 
              id: "ord_mix", 
              items: [
                { id: "item_a", title: "Apple", quantity: 1, unit_price: 10, variant: { product: { vendor: { id: "vendorA" } } } },
                { id: "item_b", title: "Banana", quantity: 1, unit_price: 20, variant: { product: { vendor: { id: "vendorB" } } } }
              ] 
            }
          ]
        }
      }
      return { data: [] }
    })

    await GET(mockReq, mockRes)
    
    expect(mockRes.json).toHaveBeenCalled()
    const { shipments } = mockRes.json.mock.calls[0][0]
    
    // Vendor A should only see ship_a (because ful_a only has item_a which belongs to Vendor A)
    // Vendor A should NOT see ship_b, even though ship_b belongs to ord_mix!
    expect(shipments.length).toBe(1)
    expect(shipments[0].id).toBe("ship_a")
    expect(shipments[0].price).toBe(10) // Only sees Vendor A's items price
  })
})
