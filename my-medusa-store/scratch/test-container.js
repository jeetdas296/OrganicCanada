const { init } = require('@medusajs/framework');
const path = require('path');

async function testContainer() {
  try {
    const medusa = await init(path.join(__dirname, '..'), {});
    console.log("Root container keys:", Object.keys(medusa.container.cradle));
    console.log("Can root resolve query?:", !!medusa.container.resolve("query"));
  } catch (e) {
    console.error("Test error:", e);
  }
}
testContainer();
