const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer admin-token'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function run() {
  try {
    console.log("Querying Shop 1 Orders (/api/admin/orders?shop=shop1)...");
    const resOrders1 = await makeRequest('/api/admin/orders?shop=shop1');
    console.log(`Status: ${resOrders1.statusCode}`);
    console.log(`Body (truncated): ${resOrders1.body.slice(0, 500)}`);

    console.log("\nQuerying Shop 2 Orders (/api/admin/orders?shop=shop2)...");
    const resOrders2 = await makeRequest('/api/admin/orders?shop=shop2');
    console.log(`Status: ${resOrders2.statusCode}`);
    console.log(`Body (truncated): ${resOrders2.body.slice(0, 500)}`);

    console.log("\nQuerying Customers (/api/admin/customers?shop=shop1)...");
    const resCust = await makeRequest('/api/admin/customers?shop=shop1');
    console.log(`Status: ${resCust.statusCode}`);
    console.log(`Body (truncated): ${resCust.body.slice(0, 500)}`);

  } catch (err) {
    console.error("Connection failed. Is the local Node.js server running on port 3000?", err.message);
  }
}

run();
