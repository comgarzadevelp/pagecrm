import { uploadCustomerEvidence } from './controllers/crmController.js';
import fs from 'fs';

async function testUpload() {
  const req = {
    params: { id: 'f8482b3e-8194-4cc6-a182-83a85f7ab4e5' },
    originalUrl: '/api/crm/companies/f8482b3e-8194-4cc6-a182-83a85f7ab4e5/evidence',
    user: { userId: '11111111-1111-1111-1111-111111111111' },
    file: {
      buffer: Buffer.from('test'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg'
    },
    body: {
      latitude: '25.6866',
      longitude: '-100.3161',
      deviceInfo: 'Test Device'
    }
  };

  const res = {
    status: function(code) {
      console.log('Status:', code);
      return this;
    },
    json: function(data) {
      console.log('JSON:', data);
    }
  };

  console.log('Starting test...');
  await uploadCustomerEvidence(req, res);
  console.log('Function returned. Waiting for setImmediate...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('Test complete.');
}

testUpload().catch(console.error);
