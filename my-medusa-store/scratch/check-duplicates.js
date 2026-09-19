const { Medusa } = require("@medusajs/framework/utils")
const { resolve } = require("path")

async function checkDuplicates() {
  console.log("Checking for duplicate PalTrackingEvent rows...")
  
  // We can write a raw sql query if we have the knex/mikro-orm instance,
  // or we can just fetch them all if there aren't many.
  try {
    const { initialize } = require("@medusajs/framework/modules-sdk")
    
    // It's easier to run Medusa in a script context:
    const medusaConfig = require("./medusa-config")
    
    // For now, let's just write a raw Postgres query using the connection string from process.env
    // or medusaConfig
    const { Client } = require("pg")
    const dbUrl = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost/medusa-db" // common default
    
    const client = new Client({
      connectionString: dbUrl
    })
    
    await client.connect()
    
    const query = `
      SELECT shipment_id, provider_event_id, COUNT(*)
      FROM pal_tracking_event
      WHERE provider_event_id IS NOT NULL
      GROUP BY shipment_id, provider_event_id
      HAVING COUNT(*) > 1
    `
    const res = await client.query(query)
    
    if (res.rows.length > 0) {
      console.log("Found duplicate rows:")
      console.table(res.rows)
    } else {
      console.log("No duplicate (shipment_id, provider_event_id) rows found. Safe to apply unique constraint.")
    }
    
    await client.end()
  } catch (err) {
    console.error("Failed to check database:", err)
  }
}

checkDuplicates()
