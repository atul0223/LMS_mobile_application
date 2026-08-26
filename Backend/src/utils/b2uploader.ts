import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/b2.ts';
import fs from 'fs-extra';
import path from 'path';

export const uploadDirectoryToB2 = async (localDirPath: string, remoteTargetFolder: string): Promise<void> => {
    // Reads directories and all nested contents recursively
    const files = await fs.readdir(localDirPath, { recursive: true, withFileTypes: true });

    for (const file of files) {
        if (file.isFile()) {
            const absoluteLocalPath = path.join(file.parentPath || localDirPath, file.name);
            const relativePath = path.relative(localDirPath, absoluteLocalPath);
            
            // Re-map internal system pathing characters to cloud web forward-slashes
            const remoteKey = path.join(remoteTargetFolder, relativePath).replace(/\\/g, '/');
            const fileBuffer = await fs.readFile(absoluteLocalPath);

            // Dynamically assign mime types for web requests (.m3u8 text vs .ts segments)
            const contentType = absoluteLocalPath.endsWith('.m3u8') 
                ? 'application/x-mpegURL' 
                : 'video/MP2T';

            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.B2_BUCKET_NAME,
                Key: remoteKey,
                Body: fileBuffer,
                ContentType: contentType
            }));
        }
    }
};
