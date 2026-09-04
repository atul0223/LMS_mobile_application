/**
 * Shapes returned by the LMS backend.
 *
 * These mirror the Mongoose models exactly, including `enrolledCources` — that
 * field is misspelled in the stored data and kept for compatibility. Do not
 * "correct" it here; it would silently stop matching the API.
 */

export type Role = "student" | "teacher";

export interface User {
    _id: string;
    username: string;
    email: string;
    fullName?: string;
    role: Role;
    isVerified?: boolean;
    profilePic?: string;
    enrolledCources?: string[];
    lifeTimeSpentMoney?: number;
}

/** Course owner as returned by `.populate("owner", ...)`. */
export interface CourseOwner {
    _id: string;
    username?: string;
    fullName?: string;
    email?: string;
    profilePic?: string;
}

export interface Course {
    _id: string;
    name: string;
    courseDescription?: string;
    /** Absent or 0 means free. */
    price?: number;
    enrolledStudentCount?: number;
    backgroundPic?: string;
    /** Populated on student endpoints; a raw id string on teacher endpoints. */
    owner?: CourseOwner | string;
    createdAt?: string;
    updatedAt?: string;
    /** Added by the student feed/search endpoints. */
    isEnrolled?: boolean;
}

export interface VideoMetadata {
    /** Preformatted by the server, e.g. "12m 42s". */
    videolength?: string;
    /** Preformatted by the server, e.g. "42.50 MB". */
    size?: string;
    orderInCourse?: number;
}

export interface Video {
    _id: string;
    title: string;
    description?: string;
    course?: string;
    metadata?: VideoMetadata;
    /**
     * Short-lived signed HLS (.m3u8) URL. Expires — never persist it; refetch
     * the list to obtain a freshly signed URL.
     */
    url: string;
    urlExpiresInSeconds?: number;
    createdAt?: string;
}

export interface Pagination {
    totalCourses: number;
    currentPage: number;
    totalPages: number;
    limit: number;
}

export interface CourseListResponse {
    message: string;
    courses: Course[];
    pagination: Pagination;
}

export interface TeacherCoursesResponse {
    message: string;
    courses: Course[];
}

export interface CourseVideosResponse {
    message: string;
    videos: Video[];
}

export interface AuthResponse {
    message: string;
    accessToken: string;
}

/**
 * Returned by login (403) and signup (200) when the account still needs email
 * verification, and by login (429) after a lockout.
 */
export interface OtpRequiredResponse {
    message: string;
    requiresOtp?: boolean;
    emailVerify?: boolean;
    retryAfterSeconds?: number;
}

export interface PurchaseResponse {
    message: string;
    transactionId: string;
    courseId: string;
}

export type CourseFeedFilter = "all" | "popular" | "newest" | "free" | "enrolled";
