import ffmpeg from 'fluent-ffmpeg';

// HLS renditions are produced by Cloudinary's eager streaming profile during
// upload, so no local multi-bitrate encoding step is needed here.

/**
 * Probes a video file on disk to retrieve its precise runtime duration in seconds
 */
export const getVideoDuration = (inputPath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration || 0);
        });
    });
};

/**
 * Compresses a video to ensure it fits under a target size (default 92MB to stay safely under Cloudinary's 100MB free tier limit)
 */
export const compressVideo = async (inputPath: string, outputPath: string, durationSeconds: number, targetSizeMB: number = 92): Promise<void> => {
    return new Promise((resolve, reject) => {
        const duration = Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 600;

        // Calculate target bitrate in kbps
        // Target size in kilobits = targetSizeMB * 1024 * 8
        const targetKilobits = targetSizeMB * 1024 * 8;
        
        // Allocate audio bitrate (64k for long videos, 96k for normal)
        const audioBitrate = duration > 1800 ? 64 : 96;
        let targetVideoBitrate = Math.floor(targetKilobits / duration) - audioBitrate;
        
        if (targetVideoBitrate < 120) {
            targetVideoBitrate = 120; // Minimum sensible bitrate
        }

        ffmpeg(inputPath)
            .outputOptions([
                '-c:v libx264',
                '-preset ultrafast',
                '-tune fastdecode',
                `-b:v ${targetVideoBitrate}k`,
                `-maxrate ${Math.floor(targetVideoBitrate * 1.25)}k`,
                `-bufsize ${targetVideoBitrate * 2}k`,
                '-c:a aac',
                `-b:a ${audioBitrate}k`,
                '-vf scale=-2:720',
                '-pix_fmt yuv420p',
                '-movflags +faststart',
                '-threads 0'
            ])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
};
