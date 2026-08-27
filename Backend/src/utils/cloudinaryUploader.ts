import cloudinary from '../config/cloudinary.ts';

export const uploadVideoToCloudinary = async (localFilePath: string, publicId?: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(
            localFilePath,
            {
                resource_type: 'video',
                public_id: publicId,
                // Automatically generate m3u8 (HLS) formats
                eager: [
                    { streaming_profile: 'hd', format: 'm3u8' }
                ],
                eager_async: true
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
    });
};
