import { POST } from "../route"

// Mock the medusa workflows
jest.mock("../../../../../../../workflows/order-management", () => ({
  fulfillOrderWorkflow: jest.fn(() => ({
    run: jest.fn().mockResolvedValue({
      result: { fulfillment: { id: "ful_123", status: "CREATED" } }
    })
  }))
}))

import { fulfillOrderWorkflow } from "../../../../../../../workflows/order-management"

describe("OMS Fulfillment API Route", () => {
  let mockGraph: jest.Mock
  let req: any
  let res: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockGraph = jest.fn()
    req = {
      params: { id: "order_123" },
      body: {
        items: [{ item_id: "item_1", quantity: 2 }]
      },
      scope: {
        resolve: jest.fn().mockReturnValue({ graph: mockGraph })
      },
      auth_context: { actor_id: null } // Admin by default
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
  })

  it("1. Valid Admin fulfillment & 8-11. Inventory, Title, LineItem correctly resolved", async () => {
    mockGraph
      .mockResolvedValueOnce({ data: [{ id: "order_123", items: [{
        id: "item_1",
        title: "Test Product",
        quantity: 5,
        variant_id: "var_1",
        detail: { fulfilled_quantity: 0 },
        variant: {
          id: "var_1",
          sku: "TEST-SKU",
          inventory_items: [{ inventory_item_id: "inv_1" }],
          product: { vendor: null }
        }
      }] }] })

    await POST(req, res)
    
    expect(res.json).toHaveBeenCalledWith({ fulfillment: { id: "ful_123", status: "CREATED" } })
    
    // Verify the workflow payload
    const workflowCall = (fulfillOrderWorkflow as any).mock.results[0].value.run.mock.calls[0][0]
    expect(workflowCall.input.items[0]).toEqual({
      id: "item_1",
      item_id: "item_1",
      line_item_id: "item_1",
      inventory_item_id: "inv_1",
      title: "Test Product",
      sku: "TEST-SKU",
      barcode: "",
      quantity: 2
    })
    
    // 12. provider successfully resolved
    expect(workflowCall.input.providerId).toBe("organic_canada_organic_canada")
  })

  it("2. Valid Vendor fulfillment", async () => {
    req.auth_context.actor_id = "user_vendor_a"
    mockGraph
      // user
      .mockResolvedValueOnce({ data: [{ vendor: { id: "vendor_a" } }] })
      // order
      .mockResolvedValueOnce({ data: [{ id: "order_123", items: [{
        id: "item_1",
        title: "Test Product",
        quantity: 5,
        variant_id: "var_1",
        variant: {
          id: "var_1",
          product: { vendor: { id: "vendor_a" } }
        }
      }] }] })
      // location
      .mockResolvedValueOnce({ data: [{ id: "loc_vendor_a" }] })

    await POST(req, res)
    expect(res.json).toHaveBeenCalledWith({ fulfillment: expect.any(Object) })
  })

  it("3. Vendor can only fulfill own products & 4. Vendor cannot fulfill another vendor's product", async () => {
    req.auth_context.actor_id = "user_vendor_a"
    mockGraph
      // user
      .mockResolvedValueOnce({ data: [{ vendor: { id: "vendor_a" } }] })
      // order
      .mockResolvedValueOnce({ data: [{ id: "order_123", items: [{
        id: "item_1", // belongs to vendor_b
        title: "Test Product",
        quantity: 5,
        variant_id: "var_1",
        variant: {
          id: "var_1",
          product: { vendor: { id: "vendor_b" } }
        }
      }] }] })

    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "You are not authorized to fulfill item item_1" })
  })

  it("5. Partial quantity fulfillment constraint", async () => {
    req.body.items[0].quantity = 4
    mockGraph
      .mockResolvedValueOnce({ data: [{ id: "order_123", items: [{
        id: "item_1",
        quantity: 5,
        detail: { fulfilled_quantity: 2 }, // only 3 remaining
        variant: { product: {} }
      }] }] })

    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: "Requested quantity for item_1 exceeds remaining fulfillable quantity" })
  })

  it("6. Invalid line item ID rejected", async () => {
    req.body.items[0].item_id = "invalid_id"
    mockGraph
      .mockResolvedValueOnce({ data: [{ id: "order_123", items: [{
        id: "item_1"
      }] }] })

    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: "Item invalid_id not found in order" })
  })
})
