import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';

async function testPatch() {
    console.log('Testing PATCH /agents/client-key...');
    const res = await fetch('https://api.d-id.com/agents/client-key', {
        method: 'PATCH',
        headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            allowed_domains: ['http://localhost:5173', 'http://localhost:3000', 'https://studio.d-id.com']
        })
    });
    console.log('PATCH Status:', res.status);
    console.log('PATCH Body:', await res.text());
}
testPatch();
