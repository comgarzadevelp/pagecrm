// backend/services/r2Service.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Configure AWS S3 Client for Cloudflare R2
 */
const getR2Client = () => {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.warn('Cloudflare R2 credentials missing in .env. Falling back to local storage.');
    return null;
  }

  return new S3Client({
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
};

/**
 * Uploads a file buffer directly to Cloudflare R2
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - Destination file name
 * @param {string} mimeType - File mimetype
 * @param {string} folder - Destination subfolder inside bucket
 * @returns {Promise<string>} The public URL of the uploaded file
 */
export const uploadToR2 = async (fileBuffer, fileName, mimeType, folder = 'container') => {
  const r2Client = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'datastorage';
  const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  // If R2 is not configured, throw error to trigger fallback
  if (!r2Client || !publicUrlBase) {
    throw new Error('R2_NOT_CONFIGURED');
  }

  const cleanFileName = fileName.replace(/\s+/g, '_');
  const key = `${folder}/${cleanFileName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType
    })
  );

  // Return the full public CDN URL of the uploaded file
  return `${publicUrlBase}/${key}`;
};

/**
 * Deletes a file from Cloudflare R2 using its public URL
 * @param {string} fileUrl - Full public URL of the file
 */
export const deleteFromR2 = async (fileUrl) => {
  const r2Client = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'datastorage';
  const publicUrlBase = process.env.CLOUDFLARE_R2_PUBLIC_URL;

  if (!r2Client || !publicUrlBase || !fileUrl) return false;

  try {
    // Extract the R2 key (e.g. "avatars/my_avatar.png") from the URL
    if (fileUrl.startsWith(publicUrlBase)) {
      const key = fileUrl.replace(`${publicUrlBase}/`, '');
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key
        })
      );
      return true;
    }
  } catch (err) {
    console.error('Error deleting object from Cloudflare R2:', err.message);
  }
  return false;
};
