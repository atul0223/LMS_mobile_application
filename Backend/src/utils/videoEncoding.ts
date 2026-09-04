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
 * Compresses a video to ensure it fits under a target size (default 95MB)
 */
export const compressVideo = async (inputPath: string, outputPath: string, durationSeconds: number, targetSizeMB: number = 95): Promise<void> => {
    return new Promise((resolve, reject) => {
        // Calculate target bitrate in kbps
        // Target size in kilobits = targetSizeMB * 1024 * 8
        const targetKilobits = targetSizeMB * 1024 * 8;
        
        // Subtract standard audio bitrate (e.g., 128 kbps) to leave room for video
        let targetVideoBitrate = Math.floor(targetKilobits / durationSeconds) - 128;
        
        if (targetVideoBitrate < 100) {
            targetVideoBitrate = 100; // Minimum sensible bitrate to prevent absolute garbage
        }

        ffmpeg(inputPath)
            .outputOptions([
                `-b:v ${targetVideoBitrate}k`,
                `-maxrate ${targetVideoBitrate * 1.5}k`,
                `-bufsize ${targetVideoBitrate * 2}k`,
                '-c:a aac',
                '-b:a 128k',
                // Optional: resize to 720p to help lower bitrate look better
                '-vf scale=-2:720'
            ])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
};
