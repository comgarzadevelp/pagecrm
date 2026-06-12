import { AgentsClient } from '@google-cloud/dialogflow-cx';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const credentialsPath = path.resolve('services/conect-497817-09d028ec19be.json');
const projectId = 'conect-497817';

const locations = ['global', 'us-central1', 'us', 'europe-west1', 'us-east1'];

async function listForLocation(location) {
  console.log(`Checking location: ${location}...`);
  const endpoint = location === 'global' ? 'dialogflow.googleapis.com' : `${location}-dialogflow.googleapis.com`;
  
  const client = new AgentsClient({
    keyFilename: credentialsPath,
    apiEndpoint: endpoint
  });

  try {
    const parent = `projects/${projectId}/locations/${location}`;
    const [agents] = await client.listAgents({ parent });
    console.log(`Success for ${location}! Found ${agents.length} agent(s):`);
    agents.forEach(a => {
      console.log(`- Name: ${a.displayName}, Path: ${a.name}`);
    });
    return agents;
  } catch (error) {
    console.log(`Failed for ${location}:`, error.message || error);
    return [];
  }
}

async function run() {
  for (const loc of locations) {
    const agents = await listForLocation(loc);
    if (agents.length > 0) {
      console.log('\n🎉 FOUND AGENTS!');
      break;
    }
  }
}

run();
