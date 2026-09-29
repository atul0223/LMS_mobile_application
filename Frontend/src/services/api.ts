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
  options: RequestInit = {}
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

  // 180s timeout for file uploads, 20s for standard requests
  const timeoutMs = options.body instanceof FormData ? 180000 : 20000;
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

export async function uploadTeacherVideo(
  payload: FormData | VideoUploadPayload
): Promise<{ success: boolean; message: string; data: any }> {
  // On native platforms (iOS/Android), attempt direct Cloudinary upload first via signature to bypass Render proxy timeouts
  if (Platform.OS !== 'web' && !(payload instanceof FormData) && payload.fileUri) {
    const appCacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    let localFileUri = payload.fileUri;
    let tempCopiedUri: string | null = null;

    try {
      // If the file is not already in the app's sandboxed directory (e.g. content:// or outside cache),
      // copy it into FileSystem.cacheDirectory so ExponentFileSystem has guaranteed read permission.
      if (appCacheDir && (!localFileUri.startsWith('file://') || !localFileUri.startsWith(appCacheDir))) {
        const sanitizedName = (payload.fileName || 'lesson.mp4').replace(/[^a-zA-Z0-9._-]/g, '_');
        const targetUri = `${appCacheDir}upload_${Date.now()}_${sanitizedName}`;
        try {
          await FileSystem.copyAsync({
            from: localFileUri,
            to: targetUri,
          });
          localFileUri = targetUri;
          tempCopiedUri = targetUri;
        } catch (copyErr) {
          console.warn('FileSystem.copyAsync failed, using original uri:', copyErr);
        }
      }

      // 1. Direct Cloudinary upload attempt via signed parameters
      try {
        const sigRes = await apiRequest<{
          signature: string;
          timestamp: number;
          publicId: string;
          apiKey: string;
          cloudName: string;
          eager: string;
        }>(`/teacher/video/signature?courseId=${encodeURIComponent(payload.courseId)}`);

        if (sigRes?.signature && sigRes?.cloudName && sigRes?.apiKey) {
          const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${sigRes.cloudName}/video/upload`;
          const cldResult = await FileSystem.uploadAsync(cloudinaryUploadUrl, localFileUri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: payload.mimeType || 'video/mp4',
            parameters: {
              api_key: sigRes.apiKey,
              timestamp: String(sigRes.timestamp),
              signature: sigRes.signature,
              public_id: sigRes.publicId,
              type: 'authenticated',
              eager: sigRes.eager,
              eager_async: 'true',
            },
          });

          if (cldResult.status >= 200 && cldResult.status < 300) {
            let cldData: any = {};
            try {
              cldData = JSON.parse(cldResult.body);
            } catch {
              cldData = {};
            }

            const recordResult = await apiRequest<{ success: boolean; message: string; data: any }>(
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
                  fileSizeBytes: cldData.bytes || 0,
                }),
              }
            );

            return recordResult;
          } else {
            console.warn('Cloudinary direct upload status:', cldResult.status, cldResult.body);
          }
        }
      } catch (directErr: any) {
        console.warn('Direct Cloudinary upload attempt bypassed:', directErr?.message);
      }

      // 2. Server proxy fallback via FileSystem.uploadAsync
      const baseUrl = await getBaseUrl();
      const token = await getStoredToken();
      const uploadUrl = `${baseUrl}/teacher/video/upload`;

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, localFileUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'mediaFile',
        mimeType: payload.mimeType || 'video/mp4',
        parameters: {
          title: payload.title,
          description: payload.description || '',
          courseId: payload.courseId,
          orderInCourse: String(payload.orderInCourse),
        },
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
          `Video upload failed with status ${uploadResult.status}`;
        const err: any = new Error(errorMsg);
        err.status = uploadResult.status;
        err.data = resData;
        throw err;
      }

      return resData;
    } catch (uploadErr: any) {
      console.warn('Native upload failed, trying standard FormData fallback:', uploadErr?.message);
      try {
        const fallbackFormData = new FormData();
        fallbackFormData.append('title', payload.title);
        if (payload.description) fallbackFormData.append('description', payload.description);
        fallbackFormData.append('courseId', payload.courseId);
        fallbackFormData.append('orderInCourse', String(payload.orderInCourse));
        // React Native compatible file descriptor
        fallbackFormData.append('mediaFile', {
          uri: localFileUri,
          name: payload.fileName || 'lesson.mp4',
          type: payload.mimeType || 'video/mp4',
        } as any);

        return await apiRequest<{ success: boolean; message: string; data: any }>(
          '/teacher/video/upload',
          {
            method: 'POST',
            body: fallbackFormData,
          }
        );
      } catch (fallbackErr: any) {
        throw new Error(uploadErr?.message || fallbackErr?.message || 'Video upload failed');
      }
    } finally {
      if (tempCopiedUri) {
        await FileSystem.deleteAsync(tempCopiedUri, { idempotent: true }).catch(() => {});
      }
    }
  }

  // Web or FormData fallback
  let body: FormData;
  if (payload instanceof FormData) {
    body = payload;
  } else {
    body = new FormData();
    body.append('title', payload.title);
    if (payload.description) body.append('description', payload.description);
    body.append('courseId', payload.courseId);
    body.append('orderInCourse', String(payload.orderInCourse));

    if (payload.file) {
      body.append('mediaFile', payload.file);
    } else if (Platform.OS === 'web') {
      const blobRes = await fetch(payload.fileUri);
      const blob = await blobRes.blob();
      body.append('mediaFile', blob, payload.fileName || 'lesson.mp4');
    } else {
      body.append('mediaFile', {
        uri: payload.fileUri,
        name: payload.fileName || 'lesson.mp4',
        type: payload.mimeType || 'video/mp4',
      } as any);
    }
  }

  return apiRequest<{ success: boolean; message: string; data: any }>(
    '/teacher/video/upload',
    {
      method: 'POST',
      body,
    }
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
