import { SessionsClient } from '@google-cloud/dialogflow-cx';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const credentialsPath = path.resolve('services/conect-497817-09d028ec19be.json');
const projectId = 'conect-497817';
const agentId = 'agent_1780337471808';
const location = 'global';
const sessionId = 'test-session-' + Date.now();

// For Agent Builder / Vertex AI Agents, the endpoint is explicitly global-dialogflow.googleapis.com
const client = new SessionsClient({
  keyFilename: credentialsPath,
  apiEndpoint: 'global-dialogflow.googleapis.com'
});

async function run() {
  const sessionPath = client.projectLocationAgentSessionPath(
    projectId,
    location,
    agentId,
    sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: 'Hola',
      },
      languageCode: 'es',
    },
  };

  try {
    console.log('Sending request to Vertex AI Agent Builder...');
    const [response] = await client.detectIntent(request);
    console.log('🎉 SUCCESS CONNECTING TO LEOPOLDO AGENT!');
    console.log('Response:');
    
    const messages = response.queryResult.responseMessages;
    for (const message of messages) {
      if (message.text) {
        console.log(`- ${message.text.text.join(' ')}`);
      }
    }
  } catch (error) {
    console.error('ERROR connecting to agent:', error.message || error);
  }
}

run();
