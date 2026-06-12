import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const credentialsPath = path.resolve('services/conect-497817-09d028ec19be.json');
const projectId = 'conect-497817';
const agentId = 'agent_1780337471808';

async function run() {
  console.log('Generating Google Auth token...');
  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token;
  console.log('Access token generated successfully!');

  // Test Locations: global, us, us-central1
  const locations = ['global', 'us', 'us-central1'];
  
  for (const location of locations) {
    console.log(`\nTrying Discovery Engine API in location: ${location}...`);
    // 1. Create a conversation
    const url = `https://discoveryengine.googleapis.com/v1beta/projects/${projectId}/locations/${location}/collections/default_collection/engines/${agentId}/conversations`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Create empty conversation
        })
      });
      
      const data = await response.json();
      console.log(`Status for creating conversation in ${location}:`, response.status);
      
      if (response.ok) {
        console.log(`\n🎉 SUCCESS! Created conversation in: ${location}`);
        const conversationName = data.name; // e.g., projects/.../conversations/xyz
        
        console.log(`Sending a message to conversation: ${conversationName}...`);
        const converseUrl = `https://discoveryengine.googleapis.com/v1beta/${conversationName}:converse`;
        
        const converseResponse = await fetch(converseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: {
              input: 'Hola, ¿quién eres?'
            }
          })
        });
        
        const converseData = await converseResponse.json();
        console.log('Converse Status:', converseResponse.status);
        console.log('Converse Response:', JSON.stringify(converseData, null, 2));
        break;
      } else {
        console.log('Response Error Details:', JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.log(`Failed for ${location}:`, err.message);
    }
  }
}

run();
