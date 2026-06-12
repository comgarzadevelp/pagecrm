import { SessionsClient } from '@google-cloud/dialogflow-cx';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const credentialsPath = path.resolve('services/conect-497817-09d028ec19be.json');
const projectId = 'conect-497817';
const agentId = 'agent_1780337471808';
const location = 'global';
const sessionId = 'test-session-' + Date.now();

const client = new SessionsClient({
  keyFilename: credentialsPath,
  apiEndpoint: location === 'global' ? undefined : `${location}-dialogflow.googleapis.com`
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
        text: 'Hola, ¿cómo te llamas?',
      },
      languageCode: 'es',
    },
  };

  try {
    console.log('Sending request to Dialogflow CX Agent...');
    const [response] = await client.detectIntent(request);
    console.log('Successfully connected!');
    console.log('Agent Response:');
    
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
