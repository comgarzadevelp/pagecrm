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

  // Test regions: us-central1, global, us
  const regions = ['us-central1', 'global', 'us'];
  
  for (const region of regions) {
    console.log(`\nChecking Vertex AI Agent Platform in region: ${region}...`);
    const url = `https://${region}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${region}/agents/${agentId}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      console.log(`Status for ${region}:`, response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log(`\n🎉 FOUND AGENT IN VERTEX AI AGENT PLATFORM! Region: ${region}`);
        break;
      }
    } catch (err) {
      console.log(`Failed for ${region}:`, err.message);
    }
  }
}

run();
