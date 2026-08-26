import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

export const s3Client = new S3Client({
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    region: process.env.B2_REGION,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID || '',
        secretAccessKey: process.env.B2_APP_KEY || ''
    }
});
