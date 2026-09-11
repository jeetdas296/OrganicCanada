import { OrganicCanadaProviderService } from "../../providers/organic-canada"

import FulfillmentPalModuleService from "../../service"

describe("Cancellation via voidShipment (Phase B Blocker Fix)", () => {
  let mockPalService: any;
  let provider: OrganicCanadaProviderService;
  
  beforeEach(() => {
    mockPalService = {
      listPalProviderBookings: jest.fn(),
      updatePalProviderBookings: jest.fn()
    };
    
    // Set the static instance directly to bypass dynamic import mocking issues
    (FulfillmentPalModuleService as any).instance = mockPalService;

    provider = new OrganicCanadaProviderService({
      carriers: {
        shiprocket: { status: "CONNECTED" },
        dhl: { status: "CONNECTED" },
        fedex: { status: "CONNECTED" },
        ups: { status: "CONNECTED" }
      }
    });

    provider.getSubAdapters().forEach(adapter => {
      jest.spyOn(adapter, "cancelShipment").mockResolvedValue(true);
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    (FulfillmentPalModuleService as any).instance = undefined;
  });

  it("TEST 1: Shiprocket.cancelShipment() called exactly once, others NOT called", async () => {
    mockPalService.listPalProviderBookings.mockResolvedValue([
      {
        id: "book_1",
        response_payload: {
          metadata: {
            carrier_id: "shiprocket",
            shiprocket_order_id: 12345
          }
        }
      }
    ]);
    
    // Call the public method which wraps voidShipment
    const success = await provider.cancelShipment("TRACK-123");
    
    expect(success).toBe(true);
    
    const shiprocket = provider.getSubAdapters().find(a => a.getIdentifier() === "shiprocket")!;
    const dhl = provider.getSubAdapters().find(a => a.getIdentifier() === "dhl")!;
    const fedex = provider.getSubAdapters().find(a => a.getIdentifier() === "fedex")!;
    
    expect(shiprocket.cancelShipment).toHaveBeenCalledTimes(1);
    expect(dhl.cancelShipment).not.toHaveBeenCalled();
    expect(fedex.cancelShipment).not.toHaveBeenCalled();
  });
  
  it("TEST 2: Shiprocket booking metadata is passed through unchanged", async () => {
    const metadata = {
      carrier_id: "shiprocket",
      shiprocket_order_id: 12345,
      shiprocket_shipment_id: 67890,
      shiprocket_awb_code: "AWB123",
      shiprocket_courier_id: 10
    };
    
    mockPalService.listPalProviderBookings.mockResolvedValue([
      {
        id: "book_2",
        response_payload: { metadata }
      }
    ]);
    
    await provider.cancelShipment("TRACK-456");
    
    const shiprocket = provider.getSubAdapters().find(a => a.getIdentifier() === "shiprocket")!;
    expect(shiprocket.cancelShipment).toHaveBeenCalledWith("TRACK-456", metadata);
  });
  
  it("TEST 3: A booking belonging to another provider selects that provider only", async () => {
    mockPalService.listPalProviderBookings.mockResolvedValue([
      {
        id: "book_3",
        response_payload: {
          metadata: {
            carrier_id: "dhl",
            dhlShipmentResponse: {}
          }
        }
      }
    ]);
    
    await provider.cancelShipment("TRACK-DHL");
    
    const shiprocket = provider.getSubAdapters().find(a => a.getIdentifier() === "shiprocket")!;
    const dhl = provider.getSubAdapters().find(a => a.getIdentifier() === "dhl")!;
    
    expect(dhl.cancelShipment).toHaveBeenCalledTimes(1);
    expect(shiprocket.cancelShipment).not.toHaveBeenCalled();
  });
  
  it("TEST 4: Provider identifier is missing/invalid fails safely", async () => {
    mockPalService.listPalProviderBookings.mockResolvedValue([
      {
        id: "book_4",
        response_payload: {
          metadata: {
            // missing carrier_id
            shiprocket_order_id: 123
          }
        }
      }
    ]);
    
    const success = await provider.cancelShipment("TRACK-INVALID");
    
    expect(success).toBe(false);
    provider.getSubAdapters().forEach(adapter => {
      expect(adapter.cancelShipment).not.toHaveBeenCalled();
    });
    expect(mockPalService.updatePalProviderBookings).not.toHaveBeenCalled();
  });
  
  it("TEST 5: Selected provider is disconnected fails safely", async () => {
    const disconnectedProvider = new OrganicCanadaProviderService({
      carriers: { shiprocket: { status: "NOT_CONFIGURED" } }
    });
    const shiprocket = disconnectedProvider.getSubAdapters().find(a => a.getIdentifier() === "shiprocket")!;
    jest.spyOn(shiprocket, "cancelShipment");

    mockPalService.listPalProviderBookings.mockResolvedValue([
      {
        id: "book_5",
        response_payload: {
          metadata: { carrier_id: "shiprocket" }
        }
      }
    ]);
    
    const success = await disconnectedProvider.cancelShipment("TRACK-DISC");
    
    expect(success).toBe(false);
    expect(shiprocket.cancelShipment).not.toHaveBeenCalled();
    expect(mockPalService.updatePalProviderBookings).not.toHaveBeenCalled();
  });
  
  it("TEST 6: Shiprocket cancellation succeeds and marks VOIDED", async () => {
    mockPalService.listPalProviderBookings.mockResolvedValue([
      {
        id: "book_6",
        response_payload: {
          metadata: { carrier_id: "shiprocket" }
        }
      }
    ]);
    
    await provider.cancelShipment("TRACK-SUCCESS");
    
    expect(mockPalService.updatePalProviderBookings).toHaveBeenCalledWith({
      id: "book_6",
      status: "VOIDED"
    });
  });
  
  it("TEST 7: Shiprocket cancellation fails and does NOT mark VOIDED", async () => {
    mockPalService.listPalProviderBookings.mockResolvedValue([
      {
        id: "book_7",
        response_payload: {
          metadata: { carrier_id: "shiprocket" }
        }
      }
    ]);
    
    const shiprocket = provider.getSubAdapters().find(a => a.getIdentifier() === "shiprocket")!;
    jest.spyOn(shiprocket, "cancelShipment").mockResolvedValue(false);
    
    const success = await provider.cancelShipment("TRACK-FAIL");
    
    expect(success).toBe(false);
    expect(mockPalService.updatePalProviderBookings).not.toHaveBeenCalled();
  });
});
