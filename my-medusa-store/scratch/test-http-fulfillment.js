const http = require('http');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 9000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  try {
    const health = await makeRequest('/health');
    console.log("Health status:", health);

    const shipping = await makeRequest('/admin/oms/shipping');
    console.log("Shipping API status:", shipping.status);
    if (shipping.data && shipping.data.shipments) {
      console.log("First 2 shipments:", JSON.stringify(shipping.data.shipments.slice(0, 2), null, 2));
    }
  } catch (err) {
    console.error("HTTP error:", err.message);
  }
}

main();
