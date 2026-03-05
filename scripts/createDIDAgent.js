// One-time script: Creates a D-ID agent and prints the agent ID.
// Usage: node scripts/createDIDAgent.js
// Then add the printed agentId to your .env as VITE_DID_AGENT_ID

const DID_API_KEY = 'a3VzaGFsc2hhcm00MzQ1QGdtYWlsLmNvbQ:JzZjCcCR1vRaJLT7uBZX2';

async function createAgent() {
    console.log('Creating D-ID agent...');

    const response = await fetch('https://api.d-id.com/agents', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${DID_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            preview_name: 'NERV Interviewer',
            embed: true,
            presenter: {
                type: 'clip',
                presenter_id: 'v2_public_Amber@0zSz8kflCN',
                voice: {
                    type: 'microsoft',
                    voice_id: 'en-US-JennyMultilingualV2Neural',
                },
            },
            llm: {
                provider: 'openai',
                model: 'gpt-4.1-mini',
                instructions:
                    'You are a professional interviewer for NERV, an AI-powered interview platform. You conduct technical, core subject, and HR round interviews. Be professional, encouraging, and insightful. Ask clear questions and provide constructive feedback.',
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create agent:', response.status, errorText);
        process.exit(1);
    }

    const data = await response.json();
    console.log('\n✅ Agent created successfully!');
    console.log(`   Agent ID: ${data.id}`);
    console.log(`   Name:     ${data.preview_name}`);
    console.log(`   Status:   ${data.status}`);
    console.log(`\nAdd the following to your .env file:`);
    console.log(`VITE_DID_AGENT_ID=${data.id}`);
}

createAgent().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
