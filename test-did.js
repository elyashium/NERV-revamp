import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';

async function test() {
    console.log('Testing GET /agents/client-key...');
    const resGet = await fetch('https://api.d-id.com/agents/client-key', {
        method: 'GET',
        headers: { 'Authorization': `Basic ${DID_API_KEY}` }
    });
    console.log('GET Status:', resGet.status);
    console.log('GET Body:', await resGet.text());
}
test();
