import dotenv from 'dotenv';
dotenv.config();

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'datastorage';

const s3Client = new S3Client({
  region: 'auto',
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED'
});

try {
  console.log('Listando objetos en el bucket:', bucketName);
  const data = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));
  console.log('Objetos encontrados:');
  if (data.Contents && data.Contents.length > 0) {
    data.Contents.forEach(obj => {
      console.log(`- ${obj.Key} (Tamaño: ${obj.Size} bytes, Modificado: ${obj.LastModified})`);
    });
  } else {
    console.log('El bucket está vacío.');
  }
} catch (error) {
  console.error('Error al listar objetos:', error);
}
