import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import path from 'path';
import fs from 'fs-extra';
import pkg from 'uuid';
const { v4: uuidv4 } = pkg;

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
        const uniqueId = uuidv4(); 
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

export const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100 MB limit
    },
    fileFilter: fileFilter
});
