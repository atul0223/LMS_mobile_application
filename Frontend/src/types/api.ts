export interface User {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'student' | 'teacher';
  isVerified?: boolean;
  enrolledCources?: string[];
  lifeTimeSpentMoney?: number;
  profilePic?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  _id: string;
  name: string;
  courseDescription?: string;
  price?: number;
  enrolledStudentCount?: number;
  backgroundPic?: string;
  owner: User | string;
  isEnrolled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VideoMetadata {
  videolength?: string;
  size?: string;
  orderInCourse?: number;
}

export interface Video {
  _id: string;
  course: string;
  title: string;
  description?: string;
  publicId?: string;
  metadata?: VideoMetadata;
  url?: string;
  urlExpiresInSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  accessToken?: string;
  requiresOtp?: boolean;
  emailVerify?: boolean;
  user?: User;
}

export interface VideoUploadPayload {
  title: string;
  description?: string;
  courseId: string;
  orderInCourse: number | string;
  fileUri: string;
  fileName?: string;
  mimeType?: string;
  file?: any;
}

export interface CourseFeedResponse {
  message: string;
  courses: Course[];
  pagination?: {
    totalCourses: number;
    currentPage: number;
    totalPages: number;
    limit: number;
  };
}

export interface TeacherCoursesResponse {
  message: string;
  courses: Course[];
}

export interface CourseVideosResponse {
  message: string;
  videos: Video[];
}

export interface SingleVideoResponse {
  message: string;
  video: Video;
}

export interface ProfilePicResponse {
  message: string;
  profilePic: string;
  user: User;
}

export interface UpdateProfileResponse {
  message: string;
  user: User;
}
