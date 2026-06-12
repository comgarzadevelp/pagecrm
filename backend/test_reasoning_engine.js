import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const credentialsPath = path.resolve('services/conect-497817-09d028ec19be.json');
const projectId = '346381676886';
const location = 'us-west1';
const engineId = '864207343338913792';

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

  // The official REST URL for your Vertex AI Reasoning Engine in us-west1
  const url = `https://us-west1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/reasoningEngines/${engineId}:query`;
  
  console.log('Connecting to Reasoning Engine:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          input: 'Hola, ¿quién eres?'
        }
      })
    });
    
    const data = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Details:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Connection error:', error);
  }
}

run();
