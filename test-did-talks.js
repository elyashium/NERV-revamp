import fetch from 'node-fetch';

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';

async function testTalkStream() {
    console.log('Testing POST /talks/streams...');
    const response = await fetch('https://api.d-id.com/talks/streams', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            source_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
        }),
    });

    console.log('Status:', response.status);
    console.log('Body:', await response.text());
}

testTalkStream();
