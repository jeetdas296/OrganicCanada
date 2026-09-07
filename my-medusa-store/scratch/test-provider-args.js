const { AbstractFulfillmentProviderService } = require("@medusajs/framework/utils");
const fs = require('fs');

class PalFulfillmentProviderService extends AbstractFulfillmentProviderService {
  constructor(container) {
    super();
    this.container = container;
  }

  async createFulfillment(...args) {
    console.log("[DEBUG_ARGS] createFulfillment called with arguments count:", args.length);
    for (let i = 0; i < args.length; i++) {
      if (args[i] && typeof args[i] === 'object') {
         console.log(`[DEBUG_ARGS] args[${i}]: keys=`, Object.keys(args[i]));
         if ('transactionManager' in args[i]) {
            console.log(`[DEBUG_ARGS] Found context in args[${i}]`);
            console.log(`[DEBUG_ARGS] Context keys:`, Object.keys(args[i]));
         }
      }
    }
    return { data: {}, labels: [] };
  }
}

// simulate call
const service = new PalFulfillmentProviderService({});
service.createFulfillment({ data: 1 }, [], {}, {}, { transactionManager: {}, __container__: { hasRegistration: () => true } })
  .then(() => console.log('done'));
