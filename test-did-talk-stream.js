import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';
const AGENT_ID = 'v2_agt_anZ8TLhn';

async function testTalkOnAgentStream() {
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
        console.log(`Testing POST /talks/streams/${stream.id}...`);
        const talkRes = await fetch(`https://api.d-id.com/talks/streams/${stream.id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: { type: 'text', input: 'Hello World' },
                session_id: stream.session_id
            }),
        });

        console.log('Talk Status:', talkRes.status);
        console.log('Talk Body:', await talkRes.text());
    }
}

testTalkOnAgentStream();
