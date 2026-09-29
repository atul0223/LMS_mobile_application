import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  AuthResponse,
  Course,
  CourseFeedResponse,
  CourseVideosResponse,
  ProfilePicResponse,
  SingleVideoResponse,
  TeacherCoursesResponse,
  UpdateProfileResponse,
  User,
  VideoUploadPayload,
} from '../types/api';

const TOKEN_KEY = 'lms_access_token';
const API_URL_KEY = 'lms_api_url';

export const DEFAULT_BASE_URL = 'https://lms-backend-bc8d.onrender.com';

let cachedBaseUrl: string = DEFAULT_BASE_URL;

export const getBaseUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(API_URL_KEY);
    // Ignore legacy local dev IPs so clients switch directly to production
    if (
      saved &&
      saved.startsWith('http') &&
      !saved.includes('192.168.') &&
      !saved.includes('localhost') &&
      !saved.includes('10.0.2.2')
    ) {
      cachedBaseUrl = saved;
      return saved;
    }
  } catch {
    // fallback to default
  }
  cachedBaseUrl = DEFAULT_BASE_URL;
  return DEFAULT_BASE_URL;
};

export const setCustomBaseUrl = async (url: string) => {
  cachedBaseUrl = url;
  await AsyncStorage.setItem(API_URL_KEY, url);
};

let inMemoryToken: string | null = null;

export const getStoredToken = async (): Promise<string | null> => {
  if (inMemoryToken) return inMemoryToken;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      inMemoryToken = token;
      return token;
    }
  } catch {
    // If native storage has issues, fall back to inMemoryToken
  }
  return inMemoryToken;
};

export const setStoredToken = async (token: string): Promise<void> => {
  inMemoryToken = token;
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch {
    // In-memory token is already set so the session will continue seamlessly
  }
};

export const removeStoredToken = async (): Promise<void> => {
  inMemoryToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Silent catch
  }
};

// Generic API caller
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type to application/json if not sending FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // 600s for file uploads, 60s for standard requests (to accommodate Render cold start), or caller-specified timeout
  const timeoutMs =
    options.timeoutMs ??
    (options.body instanceof FormData ? 600000 : 60000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/verifyOtp')) {
        await removeStoredToken();
      }
      const errorMsg =
        data.message ||
        data.error ||
        `Request failed with status ${response.status}`;
      const error: any = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.status) throw error;
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    // Network or parse error
    throw new Error(error?.message || 'Network request failed. Is the backend server running?');
  }
}

// ----------------- Auth Endpoints -----------------

export async function customSignup(payload: {
  username: string;
  password: string;
  email: string;
  fullName?: string;
  role: 'student' | 'teacher';
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/user/customSignup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyOtp(payload: {
  identifier: string;
  otp: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/user/verifyOtp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data.accessToken) {
    await setStoredToken(data.accessToken);
  }

  return data;
}

export async function sendOtp(identifier: string): Promise<{ message: string; requiresOtp?: boolean }> {
  try {
    return await apiRequest<{ message: string; requiresOtp?: boolean }>('/user/sendOtp', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  } catch (err: any) {
    if (err?.status === 404) {
      return await apiRequest<{ message: string; requiresOtp?: boolean }>('/user/resendOtp', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
    }
    throw err;
  }
}

export async function login(payload: {
  identifier: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await apiRequest<AuthResponse>('/user/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (data.accessToken) {
    await setStoredToken(data.accessToken);
  }

  return data;
}

export async function getMe(): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/user/me', {
    method: 'GET',
  });
}

// ----------------- Student Endpoints -----------------

export interface SearchCoursesParams {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'price' | 'enrolledStudentCount' | 'name';
  sortOrder?: 'asc' | 'desc';
  excludeEnrolled?: boolean;
}

export async function searchCourses(
  params: SearchCoursesParams = {}
): Promise<CourseFeedResponse> {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.append('query', params.query);
  if (params.minPrice !== undefined) searchParams.append('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) searchParams.append('maxPrice', String(params.maxPrice));
  if (params.page !== undefined) searchParams.append('page', String(params.page));
  if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
  if (params.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params.excludeEnrolled) searchParams.append('excludeEnrolled', 'true');

  const queryStr = searchParams.toString();
  return apiRequest<CourseFeedResponse>(
    `/student/courses/search${queryStr ? `?${queryStr}` : ''}`,
    { method: 'GET' }
  );
}

export interface GetCourseFeedParams {
  filter?: 'all' | 'popular' | 'newest' | 'free' | 'enrolled';
  page?: number;
  limit?: number;
}

export async function getCourseFeed(
  params: GetCourseFeedParams = {}
): Promise<CourseFeedResponse> {
  const searchParams = new URLSearchParams();
  if (params.filter) searchParams.append('filter', params.filter);
  if (params.page !== undefined) searchParams.append('page', String(params.page));
  if (params.limit !== undefined) searchParams.append('limit', String(params.limit));

  const queryStr = searchParams.toString();
  return apiRequest<CourseFeedResponse>(
    `/student/courses/feed${queryStr ? `?${queryStr}` : ''}`,
    { method: 'GET' }
  );
}

export async function purchaseCourse(
  courseId: string
): Promise<{ message: string; transactionId: string; courseId: string }> {
  return apiRequest<{ message: string; transactionId: string; courseId: string }>(
    '/student/courses/purchase',
    {
      method: 'POST',
      body: JSON.stringify({ courseId }),
    }
  );
}

// ----------------- Teacher Endpoints -----------------

export async function getTeacherCourses(): Promise<TeacherCoursesResponse> {
  return apiRequest<TeacherCoursesResponse>('/teacher/courses', {
    method: 'GET',
  });
}

export async function createCourse(payload: {
  courseName: string;
  courseDescription: string;
  price?: number;
  backgroundPic?: string;
}): Promise<{ message: string; course: Course }> {
  return apiRequest<{ message: string; course: Course }>('/teacher/courses/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCourse(payload: {
  courseId: string;
  newName?: string;
  newDescription?: string;
  newPrice?: number;
}): Promise<{ message: string; course: Course }> {
  return apiRequest<{ message: string; course: Course }>('/teacher/courses/update', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteCourse(
  courseId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/teacher/courses/delete', {
    method: 'DELETE',
    body: JSON.stringify({ courseId }),
  });
}

export async function getCourseById(
  courseId: string
): Promise<{ message: string; course: Course }> {
  return apiRequest<{ message: string; course: Course }>(
    `/student/courses/${courseId}`
  );
}

export function uploadFileWithXHR<T = any>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  headers?: Record<string, string>,
  timeoutMs: number = 0 // 0 means no timeout — supports long video uploads without socket aborts
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    xhr.timeout = timeoutMs;

    if (headers) {
      Object.keys(headers).forEach((k) => {
        xhr.setRequestHeader(k, headers[k]);
      });
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = { message: xhr.responseText };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
      } else {
        let errorMsg =
          data?.error?.message ||
          data?.message ||
          data?.error;
        if (!errorMsg || typeof errorMsg !== 'string' || errorMsg.includes('<html')) {
          if (xhr.status === 413) {
            errorMsg = 'File size exceeds single-request limit (413 Request Entity Too Large).';
          } else {
            errorMsg = `Upload failed with status ${xhr.status}`;
          }
        }
        const err: any = new Error(errorMsg);
        err.status = xhr.status;
        err.data = data;
        reject(err);
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during video upload. Please check your internet connection.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again with a stable connection.'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload was cancelled.'));
    };

    xhr.send(formData);
  });
}

export async function uploadTeacherVideo(
  payload: FormData | VideoUploadPayload,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; message: string; data: any }> {
  if (!(payload instanceof FormData) && payload.fileUri) {
    let localFileUri = payload.fileUri;
    const token = await getStoredToken();

    // Check file size on disk
    let fileSizeBytes = 0;
    try {
      const fileInfo = await FileSystem.getInfoAsync(localFileUri);
      if (fileInfo.exists && (fileInfo as any).size) {
        fileSizeBytes = (fileInfo as any).size;
      }
    } catch {
      // ignore
    }

    // 1. Direct Cloudinary upload for files <= 95MB (Cloudinary NGINX gateway returns 413 for single requests > 100MB)
    const canAttemptDirectUpload = fileSizeBytes === 0 || fileSizeBytes <= 95 * 1024 * 1024;

    if (canAttemptDirectUpload) {
      try {
        const sigRes = await apiRequest<{
          signature: string;
          timestamp: number;
          publicId: string;
          apiKey: string;
          cloudName: string;
          eager: string;
        }>(
          `/teacher/video/signature?courseId=${encodeURIComponent(payload.courseId)}`,
          { timeoutMs: 90000 }
        );

        if (sigRes?.signature && sigRes?.cloudName && sigRes?.apiKey) {
          const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${sigRes.cloudName}/video/upload`;
          const cldFormData = new FormData();

          if (Platform.OS === 'web' && payload.file) {
            cldFormData.append('file', payload.file);
          } else {
            cldFormData.append('file', {
              uri: localFileUri,
              name: payload.fileName || 'lesson.mp4',
              type: payload.mimeType || 'video/mp4',
            } as any);
          }

          cldFormData.append('api_key', sigRes.apiKey);
          cldFormData.append('timestamp', String(sigRes.timestamp));
          cldFormData.append('signature', sigRes.signature);
          cldFormData.append('public_id', sigRes.publicId);
          cldFormData.append('type', 'authenticated');
          cldFormData.append('eager', sigRes.eager);
          cldFormData.append('eager_async', 'true');

          // Streaming upload directly to Cloudinary without timeout
          const cldData = await uploadFileWithXHR<any>(
            cloudinaryUploadUrl,
            cldFormData,
            onProgress,
            undefined,
            0 // 0 = no timeout!
          );

          // Record the uploaded video metadata in MongoDB
          return await apiRequest<{ success: boolean; message: string; data: any }>(
            '/teacher/video/record',
            {
              method: 'POST',
              body: JSON.stringify({
                title: payload.title,
                description: payload.description || '',
                courseId: payload.courseId,
                orderInCourse: payload.orderInCourse,
                publicId: cldData.public_id || sigRes.publicId,
                durationSeconds: cldData.duration || 0,
                fileSizeBytes: cldData.bytes || fileSizeBytes || 0,
              }),
              timeoutMs: 90000,
            }
          );
        }
      } catch (directErr: any) {
        console.warn('Direct Cloudinary upload failed or bypassed:', directErr?.message);
        if (
          directErr?.message?.includes('exceeds maximum allowed size') ||
          directErr?.message?.includes('Unsupported video format')
        ) {
          throw directErr;
        }
      }
    }

    // 2. Server chunked upload pipeline via uploadFileWithXHR (no timeout, Cloudinary upload_large chunks the file)
    const baseUrl = await getBaseUrl();
    const uploadUrl = `${baseUrl}/teacher/video/upload`;
    const serverFormData = new FormData();
    serverFormData.append('title', payload.title);
    if (payload.description) serverFormData.append('description', payload.description);
    serverFormData.append('courseId', payload.courseId);
    serverFormData.append('orderInCourse', String(payload.orderInCourse));

    if (Platform.OS === 'web' && payload.file) {
      serverFormData.append('mediaFile', payload.file);
    } else {
      serverFormData.append('mediaFile', {
        uri: localFileUri,
        name: payload.fileName || 'lesson.mp4',
        type: payload.mimeType || 'video/mp4',
      } as any);
    }

    return await uploadFileWithXHR<{ success: boolean; message: string; data: any }>(
      uploadUrl,
      serverFormData,
      onProgress,
      token ? { Authorization: `Bearer ${token}` } : undefined,
      0 // No timeout!
    );
  }

  // Web fallback with payload as FormData
  const baseUrl = await getBaseUrl();
  const token = await getStoredToken();
  const uploadUrl = `${baseUrl}/teacher/video/upload`;

  return await uploadFileWithXHR<{ success: boolean; message: string; data: any }>(
    uploadUrl,
    payload as FormData,
    onProgress,
    token ? { Authorization: `Bearer ${token}` } : undefined,
    0
  );
}

// ----------------- Video Playback Endpoints -----------------

export async function getCourseVideos(
  courseId: string
): Promise<CourseVideosResponse> {
  return apiRequest<CourseVideosResponse>(`/videos/course/${courseId}`, {
    method: 'GET',
  });
}

export async function getVideoById(
  videoId: string
): Promise<SingleVideoResponse> {
  return apiRequest<SingleVideoResponse>(`/videos/${videoId}`, {
    method: 'GET',
  });
}

// ----------------- Profile Management Endpoints -----------------

export async function uploadProfilePicture(
  fileUri: string,
  fileName?: string,
  mimeType?: string
): Promise<ProfilePicResponse> {
  const baseUrl = await getBaseUrl();
  const token = await getStoredToken();
  const uploadUrl = `${baseUrl}/user/profilePic`;

  if (Platform.OS !== 'web') {
    const appCacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    let localFileUri = fileUri;
    let tempCopiedUri: string | null = null;

    try {
      if (appCacheDir && (!localFileUri.startsWith('file://') || !localFileUri.startsWith(appCacheDir))) {
        const sanitizedName = (fileName || 'profile.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const targetUri = `${appCacheDir}profile_${Date.now()}_${sanitizedName}`;
        try {
          await FileSystem.copyAsync({
            from: localFileUri,
            to: targetUri,
          });
          localFileUri = targetUri;
          tempCopiedUri = targetUri;
        } catch (copyErr) {
          console.warn('FileSystem.copyAsync failed for profile pic:', copyErr);
        }
      }

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, localFileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'profilePic',
        mimeType: mimeType || 'image/jpeg',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/json',
        },
      });

      let resData: any = {};
      try {
        resData = JSON.parse(uploadResult.body);
      } catch {
        resData = { message: uploadResult.body };
      }

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        const errorMsg =
          resData.message ||
          resData.error ||
          `Upload failed with status ${uploadResult.status}`;
        const err: any = new Error(errorMsg);
        err.status = uploadResult.status;
        err.data = resData;
        throw err;
      }

      return resData as ProfilePicResponse;
    } catch (uploadErr: any) {
      console.warn('Native uploadAsync failed for profile pic, attempting Blob fallback:', uploadErr?.message);
      try {
        const blobRes = await fetch(fileUri);
        const blob = await blobRes.blob();
        const fallbackFormData = new FormData();
        fallbackFormData.append('profilePic', blob, fileName || 'profile.jpg');

        return await apiRequest<ProfilePicResponse>(
          '/user/profilePic',
          {
            method: 'POST',
            body: fallbackFormData,
          }
        );
      } catch (fallbackErr: any) {
        throw new Error(uploadErr?.message || fallbackErr?.message || 'Profile picture upload failed');
      }
    } finally {
      if (tempCopiedUri) {
        await FileSystem.deleteAsync(tempCopiedUri, { idempotent: true }).catch(() => {});
      }
    }
  }

  // Web fallback
  const blobRes = await fetch(fileUri);
  const blob = await blobRes.blob();
  const formData = new FormData();
  formData.append('profilePic', blob, fileName || 'profile.jpg');
  return apiRequest<ProfilePicResponse>('/user/profilePic', {
    method: 'POST',
    body: formData,
  });
}

export async function updateUserProfile(payload: {
  fullName?: string;
  username?: string;
}): Promise<UpdateProfileResponse> {
  return apiRequest<UpdateProfileResponse>('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
