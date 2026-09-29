import cloudinary from '../config/cloudinary.ts';

/** Seconds a signed playback URL stays usable. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const uploadVideoToCloudinary = async (localFilePath: string, publicId?: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(
            localFilePath,
            {
                resource_type: 'video',
                public_id: publicId,
                // 'authenticated' keeps the asset unreachable without a valid
                // signature, so the delivery URL alone is not entitlement.
                type: 'authenticated',
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

let warnedAboutTokenKey = false;

/**
 * Mints a short-lived HLS URL for an authenticated asset.
 *
 * Callers must confirm entitlement before invoking this — signing is the
 * delivery mechanism, not the access check.
 *
 * Expiry needs Cloudinary's token-based auth: plain `sign_url` signing is
 * permanent, so a leaked link would never stop working. `expires_at` alone is
 * silently ignored by the URL builder. Token auth requires a key from the
 * Cloudinary console (Settings → Security → Token-based authentication),
 * supplied as CLOUDINARY_AUTH_TOKEN_KEY.
 */
export const buildSignedVideoUrl = (publicId: string): string => {
    const tokenKey = process.env.CLOUDINARY_AUTH_TOKEN_KEY;

    const base = {
        resource_type: 'video',
        type: 'authenticated',
        streaming_profile: 'hd',
        format: 'm3u8'
    } as Record<string, unknown>;

    if (tokenKey) {
        return cloudinary.url(publicId, {
            ...base,
            sign_url: true,
            auth_token: {
                key: tokenKey,
                duration: SIGNED_URL_TTL_SECONDS
            }
        });
    }

    // Without a token key the asset still requires a valid signature, so it is
    // not publicly enumerable — but the URL does not expire. Warn loudly
    // because that weakens the paywall for anyone who shares a link.
    if (!warnedAboutTokenKey) {
        warnedAboutTokenKey = true;
        console.warn(
            "CLOUDINARY_AUTH_TOKEN_KEY is not set — video URLs are signed but never expire. " +
            "Set it to enable expiring playback links."
        );
    }

    return cloudinary.url(publicId, { ...base, sign_url: true });
};

/** Best-effort removal used to roll back a partial upload. */
export const destroyVideo = async (publicId: string): Promise<void> => {
    await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video',
        type: 'authenticated'
    });
};

export const uploadImageToCloudinary = async (localFilePath: string, folder: string = "profile_pictures"): Promise<any> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            localFilePath,
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { width: 500, height: 500, crop: 'fill', gravity: 'face' }
                ]
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
