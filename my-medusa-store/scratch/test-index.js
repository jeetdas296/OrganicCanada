const { Client } = require('pg')

const client = new Client({
  connectionString: 'postgres://postgres:1234@127.0.0.1:5432/medusa-my-medusa-store'
})

async function run() {
  await client.connect()
  const res = await client.query(`SELECT indexdef FROM pg_indexes WHERE tablename = 'customer_notification';`)
  console.log("Indexes:")
  console.log(res.rows.map(r => r.indexdef).join('\n'))
  await client.end()
}
run().catch(console.error)
