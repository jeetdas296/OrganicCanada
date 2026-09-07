export default async function ({ container }) {
  const logger = container.resolve("logger")
  const dbConfig = container.resolve("configModule").projectConfig.databaseUrl
  logger.info(`Using database: ${dbConfig}`)

  const connection = container.resolve("pgConnection")

  try {
    const resShipment = await connection.query('SELECT * FROM pal_shipment;')
    logger.info(`pal_shipment table exists. Row count: ${resShipment.length}`)
    
    const resPackage = await connection.query('SELECT * FROM pal_package;')
    logger.info(`pal_package table exists. Row count: ${resPackage.length}`)
    
    const resAddresses = await connection.query('SELECT * FROM pal_shipment_address;')
    logger.info(`pal_shipment_address table exists. Row count: ${resAddresses.length}`)
    
    const resStatus = await connection.query('SELECT * FROM pal_shipment_status_history;')
    logger.info(`pal_shipment_status_history table exists. Row count: ${resStatus.length}`)
    
    const resBooking = await connection.query('SELECT * FROM pal_provider_booking;')
    logger.info(`pal_provider_booking table exists. Row count: ${resBooking.length}`)
    
    // Test a relationship query using joins
    const resJoin = await connection.query(`
      SELECT p0.id, p1.id as package_id
      FROM pal_shipment p0
      LEFT JOIN pal_package p1 ON p0.id = p1.shipment_id
    `)
    logger.info(`Relationship query success. Rows returned: ${resJoin.length}`)
    
  } catch (err) {
    logger.error(`Error querying database: ${err.message}`)
  }
}
