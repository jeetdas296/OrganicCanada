const { createContainer, asValue } = require('awilix');
const { Client } = require('pg');
const { PalFulfillmentProviderService } = require('../src/modules/fulfillment-pal/services/pal-fulfillment-provider');
const { FULFILLMENT_PAL_MODULE } = require('../src/modules/fulfillment-pal');

async function main() {
  const client = new Client({
    connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store'
  });
  await client.connect();

  const testFulfillmentId = "ful_test_dk_dk_" + Date.now();

  try {
    // 1. Insert fulfillment record into PG
    await client.query(`
      INSERT INTO "fulfillment" (id, location_id, provider_id, shipping_option_id, data, requires_shipping, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [testFulfillmentId, 'sloc_01KHBQ855DTDVV3S8FQ0QB9NNT', 'organic_canada_organic_canada', 'so_01KHBQ8587NH3VEDZ3Y54STFQT', '{}', true]);

    console.log(`Inserted fulfillment ${testFulfillmentId} into DB.`);

    // 2. Mock query service to query PG directly
    const mockQuery = {
      graph: async ({ entity, filters }) => {
        if (entity === "fulfillment") {
          const res = await client.query(`SELECT id, location_id FROM "fulfillment" WHERE id = $1`, [filters.id]);
          return { data: res.rows };
        }
        if (entity === "stock_location") {
          const res = await client.query(`
            SELECT sl.id, sl.name, sla.country_code, sla.city, sla.address_1, sla.postal_code
            FROM "stock_location" sl
            LEFT JOIN "stock_location_address" sla ON sl.address_id = sla.id
            WHERE sl.id = $1
          `, [filters.id]);
          return { data: res.rows.map(r => ({ id: r.id, name: r.name, address: r })) };
        }
        if (entity === "order") {
          const res = await client.query(`
            SELECT o.id, oa.country_code, oa.city, oa.address_1, oa.postal_code
            FROM "order" o
            LEFT JOIN "order_address" oa ON o.shipping_address_id = oa.id
            WHERE o.id = $1
          `, [filters.id]);
          return { data: res.rows.map(r => ({ id: r.id, type: "B2C", shipping_address: r })) };
        }
        return { data: [] };
      }
    };

    // 3. Setup palService mock for DB persistence using raw PG
    const mockPalService = {
      listPalShipments: async (filter) => {
        const res = await client.query(`SELECT * FROM "pal_shipment" WHERE external_reference = $1`, [filter.external_reference]);
        return res.rows;
      },
      createPalShipments: async (data) => {
        const res = await client.query(`
          INSERT INTO "pal_shipment" (id, order_id, external_reference, order_type, trade_type, trade_direction, origin_address_id, destination_address_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
          RETURNING *
        `, ["psh_" + Date.now(), data.order_id, data.external_reference, data.order_type, data.trade_type, data.trade_direction, data.origin_address_id, data.destination_address_id, data.status]);
        return res.rows[0];
      },
      createPalShipmentAddresses: async (data) => {
        const res = await client.query(`
          INSERT INTO "pal_shipment_address" (id, shipment_id, type, address_1, city, postal_code, country_code, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          RETURNING *
        `, ["pshaddr_" + Date.now(), data.shipment_id, data.type, data.address_1 || "", data.city || "", data.postal_code || "", data.country_code]);
        return res.rows[0];
      },
      updatePalShipments: async (data) => {
        await client.query(`
          UPDATE "pal_shipment" 
          SET origin_address_id = COALESCE($2, origin_address_id),
              destination_address_id = COALESCE($3, destination_address_id),
              trade_type = COALESCE($4, trade_type),
              trade_direction = COALESCE($5, trade_direction),
              transport_mode = COALESCE($6, transport_mode),
              selected_provider_id = COALESCE($7, selected_provider_id)
          WHERE id = $1
        `, [data.id, data.origin_address_id, data.destination_address_id, data.trade_type, data.trade_direction, data.transport_mode, data.selected_provider_id]);
      },
      createPalPackages: async (data) => {
        return { id: "pkg_1", ...data };
      },
      listPalShipmentTimelines: async () => [],
      createPalShipmentTimelines: async (data) => ({ id: "tl_" + Date.now(), ...data }),
      createPalShipmentTimelineSteps: async (data) => ({ id: "tls_" + Date.now(), ...data }),
      createPalShipmentStatusHistories: async () => {},
      listPalProviders: async () => [{ id: "prov_1", code: "ORGANIC_CANADA", priority: 1, configuration: { carriers: { easyship: { status: "CONNECTED" } } } }],
      listPalProviderBookings: async () => [],
      createPalProviderBookings: async () => {},
      retrievePalShipment: async (id) => ({ id, status: "CREATED", selected_provider_id: "organic_canada" })
    };

    const container = createContainer();
    container.register({
      [FULFILLMENT_PAL_MODULE]: asValue(mockPalService),
      fulfillmentPal: asValue(mockPalService),
      query: asValue(mockQuery)
    });

    const provider = new PalFulfillmentProviderService(container);

    console.log("Calling provider.createFulfillment...");
    const res = await provider.createFulfillment(
      {},
      [],
      { id: "order_01KPNJT6XK7J056GQ2470D7R0C" },
      { id: testFulfillmentId }
    );

    console.log("createFulfillment completed:", res);

    // Query result from PostgreSQL
    const resShipment = await client.query(`
      SELECT s.id, s.order_id, s.order_type, s.trade_type, s.status,
             oa.country_code as origin_country, oa.city as origin_city,
             da.country_code as dest_country, da.city as dest_city
      FROM "pal_shipment" s
      LEFT JOIN "pal_shipment_address" oa ON s.origin_address_id = oa.id
      LEFT JOIN "pal_shipment_address" da ON s.destination_address_id = da.id
      WHERE s.external_reference = $1
    `, [testFulfillmentId]);

    console.log("-----------------------------------------");
    console.log("Newly created PAL Shipment in DB (DK -> DK):");
    console.log(JSON.stringify(resShipment.rows[0], null, 2));
    console.log("-----------------------------------------");

    // 4. Test Cross-Border case: DK -> CA
    const testFulfillmentId2 = "ful_test_dk_ca_" + Date.now();
    await client.query(`
      INSERT INTO "fulfillment" (id, location_id, provider_id, shipping_option_id, data, requires_shipping, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [testFulfillmentId2, 'sloc_01KHBQ855DTDVV3S8FQ0QB9NNT', 'organic_canada_organic_canada', 'so_01KHBQ8587NH3VEDZ3Y54STFQT', '{}', true]);

    // Mock order_01KPZZ86DXCRFH8DQHXJP68Y2Y as destination CA
    mockQuery.graph = async ({ entity, filters }) => {
      if (entity === "fulfillment") {
        const res = await client.query(`SELECT id, location_id FROM "fulfillment" WHERE id = $1`, [filters.id]);
        return { data: res.rows };
      }
      if (entity === "stock_location") {
        const res = await client.query(`
          SELECT sl.id, sl.name, sla.country_code, sla.city, sla.address_1, sla.postal_code
          FROM "stock_location" sl
          LEFT JOIN "stock_location_address" sla ON sl.address_id = sla.id
          WHERE sl.id = $1
        `, [filters.id]);
        return { data: res.rows.map(r => ({ id: r.id, name: r.name, address: r })) };
      }
      if (entity === "order") {
        return { data: [{ id: filters.id, type: "B2C", shipping_address: { country_code: "CA", city: "Toronto", address_1: "100 Bay St", postal_code: "M5J 2N8" } }] };
      }
      return { data: [] };
    };

    console.log("Calling provider.createFulfillment for Cross-Border (DK -> CA)...");
    await provider.createFulfillment(
      {},
      [],
      { id: "order_cross_border" },
      { id: testFulfillmentId2 }
    );

    const resShipment2 = await client.query(`
      SELECT s.id, s.order_id, s.order_type, s.trade_type, s.status,
             oa.country_code as origin_country, oa.city as origin_city,
             da.country_code as dest_country, da.city as dest_city
      FROM "pal_shipment" s
      LEFT JOIN "pal_shipment_address" oa ON s.origin_address_id = oa.id
      LEFT JOIN "pal_shipment_address" da ON s.destination_address_id = da.id
      WHERE s.external_reference = $1
    `, [testFulfillmentId2]);

    console.log("-----------------------------------------");
    console.log("Newly created PAL Shipment in DB (DK -> CA):");
    console.log(JSON.stringify(resShipment2.rows[0], null, 2));
    console.log("-----------------------------------------");

  } catch (err) {
    console.error("Error executing real fulfillment test:", err);
  } finally {
    await client.end();
  }
}

main();
