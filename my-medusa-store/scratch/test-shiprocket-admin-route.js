const http = require('http');

async function testConnection(email, password) {
  const data = JSON.stringify({
    configuration: {
      carriers: {
        shiprocket: {
          action: 'test',
          options: {
            shiprocket_email: email,
            shiprocket_password: password
          }
        }
      }
    }
  });

  const options = {
    hostname: 'localhost',
    port: 9000,
    path: '/admin/pal/providers',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: JSON.parse(body || '{}')
        });
      });
    });
    
    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("=== Testing Authentication Failure ===");
  const failRes = await testConnection('invalid@email.com', 'wrongpassword');
  console.log(JSON.stringify(failRes, null, 2));
  
  console.log("\n=== Testing Authentication Success ===");
  // Assuming the user has configured SHIPROCKET_API_EMAIL/PASSWORD in .env,
  // we will pass empty email/password so it falls back to the .env config 
  // in loadShiprocketConfig. If they didn't set it, it will fail.
  const successRes = await testConnection('', '');
  console.log(JSON.stringify(successRes, null, 2));
}

run();
