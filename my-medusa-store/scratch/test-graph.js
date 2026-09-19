export default async function ({ container }) {
  const query = container.resolve("query")
  const { data } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "items.*",
      "items.item.*",
      "items.line_item.*",
      "items.line_item.variant.product.vendor.id"
    ],
    pagination: { skip: 0, take: 1 }
  })
  console.log(JSON.stringify(data, null, 2))
}
