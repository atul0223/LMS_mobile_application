import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  AuthResponse,
  Course,
  CourseFeedResponse,
  CourseVideosResponse,
  SingleVideoResponse,
  TeacherCoursesResponse,
  User,
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

export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to save access token', e);
  }
};

export const removeStoredToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Failed to remove access token', e);
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

export async function uploadTeacherVideo(
  formData: FormData
): Promise<{ success: boolean; message: string; data: any }> {
  return apiRequest<{ success: boolean; message: string; data: any }>(
    '/teacher/video/upload',
    {
      method: 'POST',
      body: formData,
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
