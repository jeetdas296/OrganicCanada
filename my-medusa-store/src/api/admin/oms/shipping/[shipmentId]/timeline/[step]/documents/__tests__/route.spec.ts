import { GET, POST } from "../route"
import { FULFILLMENT_PAL_MODULE } from "../../../../../../../../../modules/fulfillment-pal"

describe("OMS Documents Route IDOR fix", () => {
  let mockReq: any
  let mockRes: any
  let mockQuery: any
  let mockPalService: any
  let mockFileService: any

  beforeEach(() => {
    mockQuery = {
      graph: jest.fn()
    }
    
    mockPalService = {
      createPalDocuments: jest.fn().mockResolvedValue([{ id: "doc_1" }])
    }

    mockFileService = {
      createFiles: jest.fn().mockResolvedValue([{ url: "http://mock-url.com/file.jpg" }])
    }

    mockReq = {
      params: { shipmentId: "ship_1", step: "COMMERCIAL_INVOICE" },
      body: { document_type: "COMMERCIAL_INVOICE" },
      file: { 
        originalname: "test.jpg", 
        mimetype: "image/jpeg", 
        size: 1024,
        buffer: Buffer.from("test") 
      },
      scope: {
        resolve: jest.fn((key) => {
          if (key === "query") return mockQuery
          if (key === FULFILLMENT_PAL_MODULE || String(key).includes("fulfillment")) return mockPalService
          if (String(key).includes("file")) return mockFileService
          return {}
        })
      },
      auth_context: {
        actor_id: "user_vendorA"
      }
    }

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    }
  })

  it("Vendor can view own documents (200)", async () => {
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "user") return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      if (entity === "pal_shipment") return {
        data: [{
          id: "ship_1",
          order_id: "ord_1",
          timelines: [{ steps: [{ step_code: "COMMERCIAL_INVOICE", id: "step_1" }] }]
        }]
      }
      if (entity === "order") return {
        data: [{ id: "ord_1", items: [{ variant: { product: { vendor: { id: "vendorA" } } } }] }]
      }
      if (entity === "pal_document") return { data: [{ id: "doc_1", type: "COMMERCIAL_INVOICE" }] }
      return { data: [] }
    })

    await GET(mockReq, mockRes)
    
    expect(mockRes.json).toHaveBeenCalled()
    expect(mockRes.json.mock.calls[0][0].success).toBe(true)
    expect(mockRes.json.mock.calls[0][0].documents.length).toBe(1)
  })

  it("Vendor cannot view another vendor's documents (403)", async () => {
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "user") return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      if (entity === "pal_shipment") return {
        data: [{
          id: "ship_1",
          order_id: "ord_1",
          timelines: [{ steps: [{ step_code: "COMMERCIAL_INVOICE", id: "step_1" }] }]
        }]
      }
      if (entity === "order") return {
        data: [{ id: "ord_1", items: [{ variant: { product: { vendor: { id: "vendorB" } } } }] }]
      }
      return { data: [] }
    })

    await GET(mockReq, mockRes)
    
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Vendor not authorized for this shipment" }))
  })

  it("Vendor can upload to own shipment", async () => {
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "user") return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      if (entity === "pal_shipment") return {
        data: [{
          id: "ship_1",
          order_id: "ord_1",
          timelines: [{ steps: [{ step_code: "COMMERCIAL_INVOICE", id: "step_1" }] }]
        }]
      }
      if (entity === "order") return {
        data: [{ id: "ord_1", items: [{ variant: { product: { vendor: { id: "vendorA" } } } }] }]
      }
      return { data: [] }
    })

    await POST(mockReq, mockRes)
    
    expect(mockRes.json).toHaveBeenCalled()
    expect(mockRes.json.mock.calls[0][0].success).toBe(true)
    expect(mockPalService.createPalDocuments).toHaveBeenCalled()
  })

  it("Vendor cannot upload to another vendor's shipment (403)", async () => {
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "user") return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      if (entity === "pal_shipment") return {
        data: [{
          id: "ship_1",
          order_id: "ord_1",
          timelines: [{ steps: [{ step_code: "COMMERCIAL_INVOICE", id: "step_1" }] }]
        }]
      }
      if (entity === "order") return {
        data: [{ id: "ord_1", items: [{ variant: { product: { vendor: { id: "vendorB" } } } }] }]
      }
      return { data: [] }
    })

    await POST(mockReq, mockRes)
    
    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Vendor not authorized for this shipment" }))
    expect(mockFileService.createFiles).not.toHaveBeenCalled()
    expect(mockPalService.createPalDocuments).not.toHaveBeenCalled()
  })

  it("Admin can view documents (no actor_id)", async () => {
    mockReq.auth_context.actor_id = null
    
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "pal_shipment") return {
        data: [{
          id: "ship_1",
          order_id: "ord_1",
          timelines: [{ steps: [{ step_code: "COMMERCIAL_INVOICE", id: "step_1" }] }]
        }]
      }
      if (entity === "pal_document") return { data: [{ id: "doc_1", type: "COMMERCIAL_INVOICE" }] }
      return { data: [] }
    })

    await GET(mockReq, mockRes)
    
    expect(mockRes.json).toHaveBeenCalled()
    expect(mockRes.json.mock.calls[0][0].success).toBe(true)
  })

  it("Multi-vendor shipment allows access", async () => {
    mockQuery.graph.mockImplementation(async ({ entity }: any) => {
      if (entity === "user") return { data: [{ id: "user_vendorA", vendor: { id: "vendorA" } }] }
      if (entity === "pal_shipment") return {
        data: [{
          id: "ship_1",
          order_id: "ord_1",
          timelines: [{ steps: [{ step_code: "COMMERCIAL_INVOICE", id: "step_1" }] }]
        }]
      }
      if (entity === "order") return {
        data: [{ id: "ord_1", items: [
          { variant: { product: { vendor: { id: "vendorB" } } } },
          { variant: { product: { vendor: { id: "vendorA" } } } }
        ]}]
      }
      return { data: [] }
    })

    await POST(mockReq, mockRes)
    
    expect(mockRes.json).toHaveBeenCalled()
    expect(mockRes.json.mock.calls[0][0].success).toBe(true)
  })
})
