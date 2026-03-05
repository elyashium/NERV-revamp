import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';

async function testTalks() {
    console.log(`Testing POST /talks/streams...`);
    const streamRes = await fetch(`https://api.d-id.com/talks/streams`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
        }),
    });

    const stream = await streamRes.json();
    console.log('Stream Status:', streamRes.status);

    if (streamRes.ok) {
        console.log(`Testing POST /talks/streams/${stream.id}...`);
        const talkRes = await fetch(`https://api.d-id.com/talks/streams/${stream.id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                script: { type: 'text', input: 'Hello World entirely custom!' },
                session_id: stream.session_id
            }),
        });

        console.log('Talk Status:', talkRes.status);
        console.log('Talk Body:', await talkRes.text());
    } else {
        console.log('Stream Body:', stream);
    }
}

testTalks();
