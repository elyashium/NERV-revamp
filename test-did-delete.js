import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';

async function testDelete() {
    console.log('Testing DELETE /agents/client-key...');
    const resDel = await fetch('https://api.d-id.com/agents/client-key', {
        method: 'DELETE',
        headers: { 'Authorization': `Basic ${DID_API_KEY}` }
    });
    console.log('DELETE Status:', resDel.status);
    console.log('DELETE Body:', await resDel.text());
}
testDelete();
