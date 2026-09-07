const { init } = require('@medusajs/framework');
const path = require('path');
const { ContainerRegistrationKeys } = require('@medusajs/framework/utils');

async function main() {
  const medusa = await init(path.join(__dirname, '..'), {});
  const container = medusa.container;

  // Simulate calling the fulfillOrderWorkflow
  // Or just load the fulfillOrderWorkflow
  const { fulfillOrderWorkflow } = require('@medusajs/core-flows');

  console.log("fulfillOrderWorkflow loaded.", !!fulfillOrderWorkflow);
  
  // Can we get global query?
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  console.log("query exists on global container:", !!query);

  process.exit(0);
}

main();
