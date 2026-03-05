import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';
const AGENT_ID = 'v2_agt_anZ8TLhn';

async function testAgentSpeak() {
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

    if (streamRes.ok) {
        console.log(`Testing POST /agents/${AGENT_ID}/speak...`);
        const speakRes = await fetch(`https://api.d-id.com/agents/${AGENT_ID}/speak`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                streamId: stream.id,
                sessionId: stream.session_id,
                script: { type: 'text', input: 'Hello World' }
            }),
        });

        console.log('Speak Status:', speakRes.status);
        console.log('Speak Body:', await speakRes.text());
    }
}

testAgentSpeak();
