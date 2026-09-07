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

  it("returns shipments ordered by created_at DESC then id DESC for admin", async () => {
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "pal_shipment") {
        return {
          data: [
            { id: "ship_1", order_id: "ord_1", created_at: "2026-08-24T10:00:00.000Z", status: "CREATED" },
            { id: "ship_2", order_id: "ord_2", created_at: "2026-08-24T12:00:00.000Z", status: "CREATED" },
            { id: "ship_3", order_id: "ord_3", created_at: "2026-08-24T12:00:00.000Z", status: "CREATED" }
          ]
        }
      }
      if (entity === "pal_provider_booking") return { data: [] }
      if (entity === "order") {
        return {
          data: [
            { id: "ord_1", items: [{ quantity: 1, unit_price: 10 }] },
            { id: "ord_2", items: [{ quantity: 1, unit_price: 10 }] },
            { id: "ord_3", items: [{ quantity: 1, unit_price: 10 }] }
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
    expect(shipments[1].id).toBe("ship_2")
    expect(shipments[2].id).toBe("ship_1")
  })

  it("filters items by vendor and orders by newest first", async () => {
    mockReq.auth_context.actor_id = "user_vendorA"
    
    // Setup query to return a vendor A user
    mockQuery.graph.mockImplementation(async ({ entity, filters }: any) => {
      if (entity === "user") {
        return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      }
      if (entity === "pal_shipment") {
        return {
          data: [
            { id: "ship_old", order_id: "ord_mix", created_at: "2026-08-24T10:00:00.000Z", status: "CREATED" },
            { id: "ship_new", order_id: "ord_mix", created_at: "2026-08-24T12:00:00.000Z", status: "CREATED" },
            { id: "ship_other_vendor", order_id: "ord_other", created_at: "2026-08-24T13:00:00.000Z", status: "CREATED" }
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
                { quantity: 1, unit_price: 10, variant: { product: { vendor: { id: "vendorA" } } } },
                { quantity: 1, unit_price: 20, variant: { product: { vendor: { id: "vendorB" } } } }
              ] 
            },
            {
              id: "ord_other",
              items: [
                { quantity: 1, unit_price: 30, variant: { product: { vendor: { id: "vendorB" } } } }
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
    
    // Vendor A should only see ship_old and ship_new (because ord_mix has their items)
    // Vendor A should NOT see ship_other_vendor, even though it's the newest, because it has no vendor A items
    // ship_new should be first because it is newer than ship_old
    expect(shipments.length).toBe(2)
    expect(shipments[0].id).toBe("ship_new")
    expect(shipments[0].price).toBe(10) // Only sees Vendor A's items price
    expect(shipments[1].id).toBe("ship_old")
    expect(shipments[1].price).toBe(10)
  })
})
