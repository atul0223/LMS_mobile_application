import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs-extra';
import path from 'path';

// Existing encodeToHLS function remains exactly here...
export const encodeToHLS = async (inputPath: string, outputDir: string): Promise<void> => {
    await fs.ensureDir(outputDir);
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                '-map 0:v:0', '-map 0:a:0', '-map 0:v:0', '-map 0:a:0', '-map 0:v:0', '-map 0:a:0',
                '-c:v:0 libx264', '-b:v:0 800k', '-maxrate:v:0 856k', '-bufsize:v:0 1200k',
                '-filter:v:0 scale=w=842:h=480:force_original_aspect_ratio=decrease',
                '-c:v:1 libx264', '-b:v:1 2800k', '-maxrate:v:1 2996k', '-bufsize:v:1 4200k',
                '-filter:v:1 scale=w=1280:h=720:force_original_aspect_ratio=decrease',
                '-c:v:2 libx264', '-b:v:2 5000k', '-maxrate:v:2 5350k', '-bufsize:v:2 7500k',
                '-filter:v:2 scale=w=1920:h=1080:force_original_aspect_ratio=decrease',
                '-c:a aac', '-ar 48000', '-f hls', '-hls_time 4', '-hls_playlist_type event',
                '-hls_segment_filename', path.join(outputDir, 'v%v/file_%03d.ts'),
                '-master_pl_name master.m3u8', '-var_stream_map', 'v:0,a:0 v:1,a:1 v:2,a:2'
            ])
            .output(path.join(outputDir, 'v%v/manifest.m3u8'))
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .run();
    });
};

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
