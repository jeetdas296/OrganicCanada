const { createContainer, asValue } = require("awilix");

const container = createContainer();
container.register({
  remoteQuery: asValue({ graph: () => "mock_graph_result" }),
  palService: asValue({ create: () => "mock_pal" })
});

const workflowContainer = container.createScope();
workflowContainer.register({
  query: asValue(container.resolve("remoteQuery")),
  fulfillmentPal: asValue(container.resolve("palService"))
});

console.log("query:", workflowContainer.resolve("query").graph());
console.log("fulfillmentPal:", workflowContainer.resolve("fulfillmentPal").create());
