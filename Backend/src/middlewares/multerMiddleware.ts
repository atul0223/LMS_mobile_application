import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';

import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const uploadDir = path.join(__dirname, '../../tmp/uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate a random UUID and append the original file extension
        const uniqueId = crypto.randomUUID(); 
        const fileExtension = path.extname(file.originalname);
        
        cb(null, `${uniqueId}${fileExtension}`); // e.g., "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.mp4"
    }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images and videos are allowed!') as any, false);
    }
};

/**
 * Upload ceiling, in megabytes.
 *
 * Uploads are written to the container's ephemeral disk, and anything over
 * 95 MB is additionally transcoded to a second file alongside the original —
 * so peak disk use is roughly twice the upload size. On a small instance a
 * large upload fills the disk and the request fails midway through ffmpeg,
 * which is a slow and confusing failure.
 *
 * Overridable so a larger instance can raise it without a code change.
 */
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 200;

export const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: MAX_UPLOAD_MB * 1024 * 1024,
    },
    fileFilter: fileFilter
});
