const { Client } = require('pg')

async function testDatabaseIdempotency() {
  console.log("Running DB Idempotency Tests...")
  
  const dbUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost/medusa-db"
  const client = new Client({ connectionString: dbUrl })
  
  try {
    await client.connect()
    console.log("Connected to database.")

    // Find existing shipments to use
    const res = await client.query("SELECT id FROM pal_shipment LIMIT 2")
    if (res.rows.length === 0) {
      console.log("No shipments found to use for test. Skipping DB test.")
      return
    }
    const shipmentId = res.rows[0].id
    const eventId = "test_event_hash_abc"
    const now = new Date().toISOString()

    // 1. First event with a given (shipment_id, provider_event_id) is persisted.
    await client.query(`
      INSERT INTO pal_tracking_event (id, shipment_id, provider_event_id, normalized_status, event_at, created_at, updated_at)
      VALUES ('evt_1', $1, $2, 'BOOKED', $3, $3, $3)
    `, [shipmentId, eventId, now])
    console.log("✅ 1. First event persisted successfully.")

    // 2. Same event delivered again is ignored/idempotent. (Should throw unique constraint)
    let caughtDuplicateError = false
    try {
      await client.query(`
        INSERT INTO pal_tracking_event (id, shipment_id, provider_event_id, normalized_status, event_at, created_at, updated_at)
        VALUES ('evt_2', $1, $2, 'BOOKED', $3, $3, $3)
      `, [shipmentId, eventId, now])
    } catch (err) {
      if (err.code === '23505' || err.message.includes('unique constraint')) {
        caughtDuplicateError = true
      } else {
        throw err
      }
    }
    
    if (caughtDuplicateError) {
      console.log("✅ 2. Database blocked duplicate provider_event_id insertion correctly (true idempotency).")
    } else {
      console.error("❌ 2. FAILED: Database allowed duplicate provider_event_id insertion!")
      process.exit(1)
    }

    // 3. Same event ID on a different shipment is allowed.
    let shipmentId2 = shipmentId
    if (res.rows.length > 1) {
      shipmentId2 = res.rows[1].id
      await client.query(`
        INSERT INTO pal_tracking_event (id, shipment_id, provider_event_id, normalized_status, event_at, created_at, updated_at)
        VALUES ('evt_3', $1, $2, 'BOOKED', $3, $3, $3)
      `, [shipmentId2, eventId, now])
      console.log("✅ 3. Same event ID on different shipment allowed.")
    } else {
      console.log("⚠️ 3. Skipped because only 1 shipment exists.")
    }

    // 4. Different provider event IDs on the same shipment are allowed.
    await client.query(`
      INSERT INTO pal_tracking_event (id, shipment_id, provider_event_id, normalized_status, event_at, created_at, updated_at)
      VALUES ('evt_4', $1, 'different_hash_xyz', 'IN_TRANSIT', $2, $2, $2)
    `, [shipmentId, now])
    console.log("✅ 4. Different provider event IDs on the same shipment allowed.")

    // 5. NULL provider_event_id preserves existing legitimate behavior (multiple nulls allowed).
    await client.query(`
      INSERT INTO pal_tracking_event (id, shipment_id, provider_event_id, normalized_status, event_at, created_at, updated_at)
      VALUES ('evt_5', $1, NULL, 'BOOKED', $2, $2, $2)
    `, [shipmentId, now])
    
    await client.query(`
      INSERT INTO pal_tracking_event (id, shipment_id, provider_event_id, normalized_status, event_at, created_at, updated_at)
      VALUES ('evt_6', $1, NULL, 'IN_TRANSIT', $2, $2, $2)
    `, [shipmentId, now])
    console.log("✅ 5. Multiple NULL provider_event_id rows allowed.")
    
    console.log("\nAll DB uniqueness tests passed!")
    
  } catch (err) {
    console.error("Test failed:", err)
  } finally {
    // Cleanup
    try {
      await client.query("DELETE FROM pal_tracking_event WHERE id IN ('evt_1', 'evt_2', 'evt_3', 'evt_4', 'evt_5', 'evt_6')")
      await client.query("DELETE FROM pal_shipment WHERE id IN ('test_shipment_123', 'test_shipment_456')")
    } catch(e) {}
    await client.end()
  }
}

testDatabaseIdempotency()
