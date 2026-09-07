import { PalFulfillmentProviderService } from "../services/pal-fulfillment-provider"

describe("PalFulfillmentProviderService", () => {
  it("returns early with existing payload when fulfillment ID already mapped to a PAL shipment", async () => {
    // Mock the container and palService
    const mockPalService = {
      listPalShipments: jest.fn().mockResolvedValue([{ id: "pal_ship_existing", status: "CREATED" }])
    }
    const mockContainer = {
      fulfillmentPal: mockPalService
    }

    const provider = new PalFulfillmentProviderService(mockContainer)
    
    // Attempt to create fulfillment with an ID that already exists
    const result = await provider.createFulfillment(
      {}, // data
      [], // items
      { id: "ord_1" }, // order
      { id: "ful_existing" } // fulfillment
    )

    expect(mockPalService.listPalShipments).toHaveBeenCalledWith({ external_reference: "ful_existing" })
    
    // It should NOT call processPalShipmentWorkflow, but just return the existing data
    expect(result.data).toEqual({
      pal_shipment_id: "pal_ship_existing",
      status: "CREATED"
    })
    expect(result.labels).toEqual([])
  })

  it("can be instantiated through the Medusa container and does not resolve a dependency named resolve", async () => {
    // Mock the container properly mimicking a proxy without .resolve
    const mockPalService = {
      listPalShipments: jest.fn().mockResolvedValue([])
    }
    const mockContainer = {
      fulfillmentPal: mockPalService
    }
    
    const provider = new PalFulfillmentProviderService(mockContainer)
    
    // Attempt to create fulfillment with a new ID
    // We expect it to try to run the workflow. Since the workflow uses the container,
    // and we don't have a real Medusa workflow environment in this unit test without createWorkflow mock,
    // we just want to ensure it doesn't throw a "Could not resolve 'resolve'" error before hitting workflow.
    
    // Note: We need to mock the workflow runner or expect it to throw a workflow error, NOT a resolution error.
    let error: any = null
    try {
      await provider.createFulfillment(
        {},
        [],
        { id: "ord_1" },
        { id: "ful_new" }
      )
    } catch (e: any) {
      error = e
    }
    
    // Assert it did NOT throw a resolution error containing "resolve"
    if (error) {
      expect(error.message).not.toMatch(/Could not resolve 'resolve'/)
    } else {
      // In case the workflow runs successfully in test context (e.g. mocked)
      expect(error).toBeNull()
    }
    
    expect(mockPalService.listPalShipments).toHaveBeenCalledWith({ external_reference: "ful_new" })
  })
})
