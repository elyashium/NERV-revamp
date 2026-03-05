import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';
const AGENT_ID = 'v2_agt_anZ8TLhn';

async function testAgentChat() {
    console.log(`Testing POST /agents/${AGENT_ID}/streams...`);
    const streamRes = await fetch(`https://api.d-id.com/agents/${AGENT_ID}/streams`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
    });

    const stream = await streamRes.json();
    console.log('Stream Status:', streamRes.status);

    if (streamRes.ok) {
        console.log(`Testing POST /agents/${AGENT_ID}/chat...`);
        const chatRes = await fetch(`https://api.d-id.com/agents/${AGENT_ID}/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                streamId: stream.id,
                sessionId: stream.session_id,
                messages: [{ role: 'user', content: 'Say hello!' }]
            }),
        });

        console.log('Chat Status:', chatRes.status);
        console.log('Chat Body:', await chatRes.text());
    }
}

testAgentChat();
