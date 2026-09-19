export default async function ({ container }) {
  const fulfillmentService = container.resolve("fulfillmentModuleService")
  
  const fulfillments = await fulfillmentService.listFulfillments(
    { id: "ful_01M0S52RWSEEYNAW2D6EVGV51N" }, 
    { relations: ["items"] }
  )
  
  console.log(JSON.stringify(fulfillments, null, 2))
}
