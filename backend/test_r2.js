import dotenv from 'dotenv';
dotenv.config();

import { uploadToR2 } from './services/r2Service.js';

const testBuffer = Buffer.from('Hola, esto es una prueba de subida a Cloudflare R2!');
const fileName = `test_file_${Date.now()}.txt`;

console.log('Iniciando prueba de subida a R2...');
console.log('Credenciales cargadas:');
const keyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const secretKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
console.log('Access Key ID:', keyId, `(largo: ${keyId.length})`);
console.log('Secret Access Key:', secretKey.substring(0, 5) + '...', `(largo: ${secretKey.length})`);
console.log('Endpoint:', process.env.CLOUDFLARE_R2_ENDPOINT);

try {
  const url = await uploadToR2(testBuffer, fileName, 'text/plain', 'test');
  console.log('¡Éxito! Archivo subido correctamente. URL:', url);
} catch (error) {
  console.error('Error durante la subida a R2:', error);
}
