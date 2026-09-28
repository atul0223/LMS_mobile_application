import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { getCourseVideos, getVideoById } from "../../services/api";
import { useToast } from "../../components/Toast";
import { Video } from "../../types/api";

function VideoPlayerComponent({ videoUrl }: { videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <View style={styles.playerContainer}>
      <VideoView
        player={player}
        style={styles.videoView}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
        startsPictureInPictureAutomatically
      />
    </View>
  );
}

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams<{
    videoId?: string;
    courseId?: string;
    videoTitle?: string;
    videoDesc?: string;
    videoUrl?: string;
  }>();

  const { showToast } = useToast();
  const [currentVideoId, setCurrentVideoId] = useState<string>(params.videoId || "");
  const [video, setVideo] = useState<Video | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>(params.videoUrl || "");
  const [playlist, setPlaylist] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(!params.videoUrl);
  const [error, setError] = useState<string | null>(null);

  // Fetch current video details & signed URL
  useEffect(() => {
    if (!currentVideoId) return;

    const fetchVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getVideoById(currentVideoId);
        if (res.video) {
          setVideo(res.video);
          if (res.video.url) {
            setVideoUrl(res.video.url);
          }
        }
      } catch (err: any) {
        console.error("Failed to load video:", err);
        setError(err.message || "Failed to load video stream");
        showToast(err.message || "Could not generate playback stream", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [currentVideoId, showToast]);

  // Fetch playlist for the course so user can seamlessly switch lessons
  useEffect(() => {
    if (!params.courseId) return;

    const fetchPlaylist = async () => {
      try {
        const res = await getCourseVideos(params.courseId!);
        setPlaylist(res.videos || []);
      } catch (e) {
        console.warn("Could not load playlist for player", e);
      }
    };

    fetchPlaylist();
  }, [params.courseId]);

  const currentIndex = playlist.findIndex((v) => v._id === currentVideoId);
  const prevLesson = currentIndex > 0 ? playlist[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < playlist.length - 1
      ? playlist[currentIndex + 1]
      : null;

  const switchToLesson = (target: Video) => {
    setCurrentVideoId(target._id);
    if (target.url) {
      setVideoUrl(target.url);
    }
  };

  const title = video?.title || params.videoTitle || "Lesson Video";
  const description = video?.description || params.videoDesc || "";
  const duration = video?.metadata?.videolength;
  const size = video?.metadata?.size;
  const order = video?.metadata?.orderInCourse;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (params.courseId) {
              router.push({
                pathname: "/detailspage",
                params: { courseId: params.courseId },
              });
            } else {
              router.back();
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="list" size={22} color="#FF8383" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Video Player Box */}
        {videoUrl ? (
          <VideoPlayerComponent key={videoUrl} videoUrl={videoUrl} />
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#FF8383" />
            <Text style={styles.loadingText}>Fetching secure stream...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={36} color="#d93025" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                if (currentVideoId) {
                  getVideoById(currentVideoId)
                    .then((r) => {
                      if (r.video?.url) setVideoUrl(r.video.url);
                    })
                    .catch((e) => setError(e.message));
                }
              }}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Lesson Navigation Controls (Prev / Next) */}
        <View style={styles.lessonNavRow}>
          <TouchableOpacity
            style={[styles.lessonNavBtn, !prevLesson && styles.lessonNavBtnDisabled]}
            disabled={!prevLesson}
            onPress={() => prevLesson && switchToLesson(prevLesson)}
          >
            <Ionicons name="chevron-back" size={16} color={prevLesson ? "#555" : "#ccc"} />
            <Text style={[styles.lessonNavBtnText, !prevLesson && { color: "#ccc" }]}>
              Previous
            </Text>
          </TouchableOpacity>

          <View style={styles.lessonCounterBadge}>
            <Text style={styles.lessonCounterText}>
              Lesson {order ?? (currentIndex >= 0 ? currentIndex + 1 : 1)} of {playlist.length || 1}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.lessonNavBtn, !nextLesson && styles.lessonNavBtnDisabled]}
            disabled={!nextLesson}
            onPress={() => nextLesson && switchToLesson(nextLesson)}
          >
            <Text style={[styles.lessonNavBtnText, !nextLesson && { color: "#ccc" }]}>
              Next
            </Text>
            <Ionicons name="chevron-forward" size={16} color={nextLesson ? "#FF8383" : "#ccc"} />
          </TouchableOpacity>
        </View>

        {/* Lesson Details Card */}
        <View style={styles.infoCard}>
          <Text style={styles.lessonTitle}>{title}</Text>

          <View style={styles.metaRow}>
            {duration ? (
              <View style={styles.metaBadge}>
                <Ionicons name="time-outline" size={13} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{duration}</Text>
              </View>
            ) : null}
            {size ? (
              <View style={styles.metaBadge}>
                <Ionicons name="folder-outline" size={13} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>{size}</Text>
              </View>
            ) : null}
            <View style={[styles.metaBadge, { backgroundColor: "#e6f9ed" }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={[styles.metaText, { color: "#10B981" }]}>HLS Encoded</Text>
            </View>
          </View>

          {description ? (
            <View style={styles.descSection}>
              <Text style={styles.descHeading}>Lesson Overview</Text>
              <Text style={styles.descBody}>{description}</Text>
            </View>
          ) : null}
        </View>

        {/* Course Playlist Drawer */}
        {playlist.length > 0 ? (
          <View style={styles.playlistSection}>
            <Text style={styles.playlistHeader}>Course Playlist</Text>
            {playlist.map((item, idx) => {
              const isSelected = item._id === currentVideoId;
              return (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.playlistItem, isSelected && styles.playlistItemActive]}
                  onPress={() => switchToLesson(item)}
                >
                  <View
                    style={[
                      styles.playlistIndexCircle,
                      isSelected && { backgroundColor: "#FF8383" },
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons name="play" size={12} color="#fff" />
                    ) : (
                      <Text style={styles.playlistIndexText}>{idx + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[
                        styles.playlistTitle,
                        isSelected && { color: "#FF8383", fontWeight: "bold" },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {item.metadata?.videolength ? (
                      <Text style={styles.playlistMeta}>{item.metadata.videolength}</Text>
                    ) : null}
                  </View>
                  {isSelected ? (
                    <Text style={styles.nowPlayingText}>Now Playing</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    maxWidth: "70%",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  playerContainer: {
    width: "100%",
    height: 230,
    backgroundColor: "#000",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#555",
    marginBottom: 12,
  },
  videoView: {
    width: "100%",
    height: "100%",
  },
  loadingBox: {
    width: "100%",
    height: 230,
    backgroundColor: "#f5f5f5",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#555",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#777",
  },
  errorBox: {
    width: "100%",
    height: 200,
    backgroundColor: "#ffe5e5",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FF8383",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
  },
  errorText: {
    color: "#d93025",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: "#FF8383",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  lessonNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  lessonNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  lessonNavBtnDisabled: {
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  lessonNavBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  lessonCounterBadge: {
    backgroundColor: "#fff5f5",
    borderWidth: 1,
    borderColor: "#FF8383",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lessonCounterText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FF8383",
  },
  infoCard: {
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
    marginVertical: 10,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 10,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  descSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  descHeading: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#888",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  descBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#444",
  },
  playlistSection: {
    marginTop: 10,
  },
  playlistHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
    marginBottom: 10,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  playlistItemActive: {
    borderColor: "#FF8383",
    backgroundColor: "#fff9f9",
  },
  playlistIndexCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  playlistIndexText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  playlistMeta: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  nowPlayingText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#FF8383",
  },
});
