import { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Screen, LoadingState, EmptyState, Banner, Card } from "@/components";
import theme from "@/theme";
import api from "@/lib/api";
import type { Video, CourseVideosResponse } from "@/types/api";

export default function WatchScreen() {
    const { courseId } = useLocalSearchParams<{ courseId: string }>();
    const router = useRouter();

    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isForbidden, setIsForbidden] = useState(false);
    
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

    const fetchVideos = async () => {
        try {
            setIsLoading(true);
            setErrorMsg(null);
            setIsForbidden(false);

            const res = await api.get<CourseVideosResponse>(`/videos/course/${courseId}`);
            
            // Sort videos
            const sorted = res.videos.sort((a, b) => {
                const orderA = a.metadata?.orderInCourse ?? 9999;
                const orderB = b.metadata?.orderInCourse ?? 9999;
                return orderA - orderB;
            });
            
            setVideos(sorted);
            if (sorted.length > 0 && !selectedVideoId) {
                setSelectedVideoId(sorted[0]._id);
            }
        } catch (err: any) {
            if (err.status === 403) {
                setIsForbidden(true);
            } else {
                setErrorMsg(err.message || "Failed to load videos.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, [courseId]);

    const selectedVideo = videos.find((v) => v._id === selectedVideoId);

    // `useVideoPlayer` keys on the source URL, so a refetch that re-signs URLs
    // tears down and rebuilds the player, restarting the lesson. Rather than
    // refetching on a timer, re-sign only when a URL has actually gone stale:
    // when playback errors, or when the user picks a lesson after expiry.
    const expiresAt = useRef<number | null>(null);
    useEffect(() => {
        const ttl = videos[0]?.urlExpiresInSeconds;
        expiresAt.current = ttl ? Date.now() + ttl * 1000 : null;
    }, [videos]);

    const refreshIfExpired = () => {
        if (expiresAt.current !== null && Date.now() >= expiresAt.current - 60_000) {
            void fetchVideos();
            return true;
        }
        return false;
    };

    const player = useVideoPlayer(selectedVideo?.url || "", (p) => {
        if (selectedVideo?.url) {
            p.play();
        }
    });

    // A signed URL that expired mid-session surfaces as a player error; that is
    // the reliable signal to re-sign, and it preserves the current lesson.
    useEffect(() => {
        const subscription = player.addListener("statusChange", ({ status, error }) => {
            if (status === "error" && error) {
                refreshIfExpired();
            }
        });
        return () => subscription.remove();
    }, [player]);

    if (isLoading && videos.length === 0) {
        return <LoadingState />;
    }

    if (isForbidden) {
        return (
            <Screen>
                <EmptyState
                    title="Not Enrolled"
                    description="You must purchase this course to watch its videos."
                    actionLabel="Go to Course"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    if (errorMsg && videos.length === 0) {
        return (
            <Screen>
                <EmptyState
                    title="Error"
                    description={errorMsg}
                    actionLabel="Retry"
                    onAction={fetchVideos}
                />
            </Screen>
        );
    }

    if (videos.length === 0) {
        return (
            <Screen>
                <EmptyState
                    title="No Videos"
                    description="This course does not have any videos yet."
                    actionLabel="Go Back"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    return (
        <Screen edges={["top", "bottom"]} padded={false}>
            {/* Player Container */}
            <View style={styles.playerContainer}>
                {selectedVideo ? (
                    <VideoView
                        player={player}
                        nativeControls
                        contentFit="contain"
                        style={styles.videoView}
                    />
                ) : (
                    <View style={[styles.videoView, styles.placeholderView]}>
                        <Text style={styles.placeholderText}>Select a video to play</Text>
                    </View>
                )}
            </View>

            {/* Video Details & List */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {selectedVideo && (
                    <View style={styles.nowPlaying}>
                        <Text style={styles.nowPlayingTitle}>{selectedVideo.title}</Text>
                        {selectedVideo.description && (
                            <Text style={styles.nowPlayingDesc}>{selectedVideo.description}</Text>
                        )}
                    </View>
                )}

                <Text style={styles.listTitle}>Lessons</Text>
                <View style={styles.lessonList}>
                    {videos.map((video, index) => {
                        const isSelected = video._id === selectedVideoId;
                        return (
                            <TouchableOpacity
                                key={video._id}
                                onPress={() => setSelectedVideoId(video._id)}
                                activeOpacity={0.7}
                            >
                                <Card style={[styles.lessonCard, isSelected && styles.lessonCardActive]}>
                                    <View style={styles.lessonContent}>
                                        <Text style={[styles.lessonNumber, isSelected && styles.activeText]}>
                                            {index + 1}
                                        </Text>
                                        <View style={styles.lessonText}>
                                            <Text style={[styles.lessonTitle, isSelected && styles.activeText]}>
                                                {video.title}
                                            </Text>
                                            {video.metadata?.videolength && (
                                                <Text style={styles.lessonMeta}>
                                                    {video.metadata.videolength}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </Card>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    playerContainer: {
        width: "100%",
        aspectRatio: 16 / 9,
        backgroundColor: theme.colors.textPrimary, // Dark background for video container
    },
    videoView: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    placeholderView: {
        alignItems: "center",
        justifyContent: "center",
    },
    placeholderText: {
        ...theme.type.body,
        color: theme.colors.surface,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        gap: theme.spacing.xl,
    },
    nowPlaying: {
        gap: theme.spacing.xs,
    },
    nowPlayingTitle: {
        ...theme.type.title,
        color: theme.colors.textPrimary,
    },
    nowPlayingDesc: {
        ...theme.type.body,
        color: theme.colors.textSecondary,
    },
    listTitle: {
        ...theme.type.heading,
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    lessonList: {
        gap: theme.spacing.sm,
    },
    lessonCard: {
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
    },
    lessonCardActive: {
        backgroundColor: theme.colors.primarySoft,
        borderColor: theme.colors.primary,
    },
    lessonContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.sm, // Inner padding adjusting Card defaults if necessary
    },
    lessonNumber: {
        ...theme.type.title,
        color: theme.colors.textTertiary,
        width: 32,
        textAlign: "center",
    },
    lessonText: {
        flex: 1,
        gap: 4,
    },
    lessonTitle: {
        ...theme.type.body,
        fontWeight: "600",
        color: theme.colors.textPrimary,
    },
    activeText: {
        color: theme.colors.primary,
    },
    lessonMeta: {
        ...theme.type.caption,
        color: theme.colors.textSecondary,
    },
});
