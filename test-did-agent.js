import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';
const AGENT_ID = 'v2_agt_anZ8TLhn';

async function testAgentStream() {
    console.log(`Testing POST /agents/${AGENT_ID}/streams...`);
    const response = await fetch(`https://api.d-id.com/agents/${AGENT_ID}/streams`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    console.log('Status:', response.status);
    console.log('Body:', await response.text());
}

testAgentStream();
