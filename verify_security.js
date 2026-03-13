const fetch = require('node-fetch');

async function testAuth() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('--- Testing /admin access without token ---');
  let res = await fetch(`${baseUrl}/admin`);
  console.log('Status:', res.status);
  let text = await res.text();
  if (text.includes('id="loginForm"') && !text.includes('id="adminPanel" style="display: block;"')) {
    console.log('SUCCESS: /admin served login form (JS still needs to hide/show)');
  }

  console.log('\n--- Testing /admin.html direct access ---');
  res = await fetch(`${baseUrl}/admin.html`);
  console.log('Status (should be handled by server or 404 in Vercel):', res.status);

  console.log('\n--- Testing protected API route /products (POST) without token ---');
  res = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Test' })
  });
  console.log('Status (should be 401):', res.status);
  let json = await res.json();
  console.log('Response:', json);

  console.log('\n--- Testing login and cookie ---');
  res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin1234' })
  });
  console.log('Login Status:', res.status);
  const cookies = res.headers.get('set-cookie');
  console.log('Cookies in response:', cookies ? 'FOUND' : 'NOT FOUND');
  if (cookies && cookies.includes('romeroToken')) {
    console.log('SUCCESS: romeroToken cookie set');
  }

  const data = await res.json();
  const token = data.token;

  console.log('\n--- Testing protected API route with token header ---');
  res = await fetch(`${baseUrl}/products`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Status (should be 200 and include inactive):', res.status);

  console.log('\n--- Testing logout ---');
  res = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });
  console.log('Logout Status:', res.status);
  const logoutCookies = res.headers.get('set-cookie');
  console.log('Logout Cookies:', logoutCookies);
  if (logoutCookies && logoutCookies.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT')) {
    console.log('SUCCESS: Cookie cleared via logout');
  }
}

testAuth().catch(console.error);
