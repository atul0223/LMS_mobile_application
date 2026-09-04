import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import type { CourseListResponse, Course } from "@/types/api";

interface Options {
    /** Endpoint path, e.g. "/student/courses/feed". */
    path: string;
    /** Extra query parameters; changing these resets to page 1. */
    query?: Record<string, string | number | undefined>;
    /** Set false to hold off fetching, e.g. an empty search box. */
    enabled?: boolean;
}

interface Result {
    courses: Course[];
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    error: string | null;
    hasMore: boolean;
    refresh: () => void;
    loadMore: () => void;
}

const PAGE_SIZE = 10;

/**
 * Paginated course list loader shared by the feed and search screens.
 *
 * Serialising the query into the effect dependency means any filter change
 * transparently resets pagination, so callers never coordinate that themselves.
 */
export function useCourseList({ path, query, enabled = true }: Options): Result {
    const [courses, setCourses] = useState<Course[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(enabled);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const queryKey = JSON.stringify(query ?? {});
    /** Discards responses from a superseded query or unmounted screen. */
    const requestId = useRef(0);

    const fetchPage = useCallback(
        async (targetPage: number, mode: "initial" | "refresh" | "more") => {
            if (!enabled) return;

            const id = ++requestId.current;
            if (mode === "initial") setIsLoading(true);
            if (mode === "refresh") setIsRefreshing(true);
            if (mode === "more") setIsLoadingMore(true);
            setError(null);

            try {
                const parsedQuery = JSON.parse(queryKey) as Record<string, string | number>;
                const response = await api.get<CourseListResponse>(path, {
                    query: { ...parsedQuery, page: targetPage, limit: PAGE_SIZE },
                });

                if (id !== requestId.current) return;

                setCourses((prev) =>
                    mode === "more" ? [...prev, ...response.courses] : response.courses
                );
                setPage(response.pagination.currentPage);
                setTotalPages(response.pagination.totalPages);
            } catch (err) {
                if (id !== requestId.current) return;

                // 401 is handled globally by the API client; surfacing it here
                // would flash an error during the sign-out redirect.
                if (err instanceof ApiError && err.status === 401) return;

                setError(
                    err instanceof ApiError ? err.message : "Unable to load courses. Please try again."
                );
            } finally {
                if (id === requestId.current) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    setIsLoadingMore(false);
                }
            }
        },
        [path, queryKey, enabled]
    );

    useEffect(() => {
        if (!enabled) {
            setCourses([]);
            setIsLoading(false);
            return;
        }
        void fetchPage(1, "initial");
    }, [fetchPage, enabled]);

    // Abandon in-flight results when the screen goes away.
    useEffect(() => () => { requestId.current += 1; }, []);

    const refresh = useCallback(() => {
        void fetchPage(1, "refresh");
    }, [fetchPage]);

    const hasMore = page < totalPages;

    const loadMore = useCallback(() => {
        if (isLoading || isLoadingMore || isRefreshing || !hasMore) return;
        void fetchPage(page + 1, "more");
    }, [fetchPage, hasMore, isLoading, isLoadingMore, isRefreshing, page]);

    return {
        courses,
        isLoading,
        isRefreshing,
        isLoadingMore,
        error,
        hasMore,
        refresh,
        loadMore,
    };
}

export default useCourseList;
