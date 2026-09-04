import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Screen, TextField, Button, Banner, Card, EmptyState, LoadingState } from "@/components";
import api from "@/lib/api";
import theme from "@/theme";
import type { Course, TeacherCoursesResponse, Video, CourseVideosResponse } from "@/types/api";

export default function TeacherCourseEditScreen() {
    const { id, course: courseParam } = useLocalSearchParams<{ id: string; course?: string }>();
    const router = useRouter();

    const [course, setCourse] = useState<Course | null>(courseParam ? JSON.parse(courseParam) : null);
    const [isLoading, setIsLoading] = useState(!courseParam);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Edit form state
    const [name, setName] = useState(course?.name || "");
    const [description, setDescription] = useState(course?.courseDescription || "");
    const [price, setPrice] = useState(course?.price?.toString() || "");
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateMsg, setUpdateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Videos state
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(true);
    const [videosError, setVideosError] = useState<string | null>(null);

    // Upload state
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadDesc, setUploadDesc] = useState("");
    const [uploadOrder, setUploadOrder] = useState("");
    const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (!course) fetchCourse();
        fetchVideos();
    }, [id]);

    const fetchCourse = async () => {
        try {
            setIsLoading(true);
            const res = await api.get<TeacherCoursesResponse>("/teacher/courses");
            const found = res.courses.find((c) => c._id === id);
            if (found) {
                setCourse(found);
                setName(found.name);
                setDescription(found.courseDescription || "");
                setPrice(found.price?.toString() || "");
            } else {
                setErrorMsg("Course not found.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load course.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchVideos = async () => {
        try {
            setIsLoadingVideos(true);
            setVideosError(null);
            const res = await api.get<CourseVideosResponse>(`/videos/course/${id}`);
            const sorted = [...res.videos].sort(
                (a, b) => (a.metadata?.orderInCourse ?? 0) - (b.metadata?.orderInCourse ?? 0)
            );
            setVideos(sorted);
        } catch (err: any) {
            // Surfaced rather than swallowed: a failure here means the upload
            // form's default ordering is wrong and the list is misleading.
            if (err.status !== 401) {
                setVideosError(err.message || "Couldn't load this course's videos.");
            }
        } finally {
            setIsLoadingVideos(false);
        }
    };

    const handleUpdate = async () => {
        setUpdateMsg(null);
        const updates: any = { courseId: id };
        let hasChanges = false;

        if (name.trim() && name !== course?.name) {
            updates.newName = name.trim();
            hasChanges = true;
        }
        if (description.trim() !== (course?.courseDescription || "")) {
            updates.newDescription = description.trim();
            hasChanges = true;
        }
        const priceNum = price === "" ? 0 : parseFloat(price);
        if (!isNaN(priceNum) && priceNum !== (course?.price || 0)) {
            updates.newPrice = priceNum;
            hasChanges = true;
        }

        if (!hasChanges) {
            setUpdateMsg({ type: "error", text: "No changes to save." });
            return;
        }

        try {
            setIsUpdating(true);
            await api.put("/teacher/courses/update", updates);
            setUpdateMsg({ type: "success", text: "Course updated successfully." });
            fetchCourse();
        } catch (err: any) {
            setUpdateMsg({ type: "error", text: err.message || "Failed to update course." });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = () => {
        Alert.alert("Delete Course", "Are you sure? This action is irreversible.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    try {
                        await api.del("/teacher/courses/delete", { courseId: id });
                        router.replace("/(teacher)");
                    } catch (err: any) {
                        setUpdateMsg({ type: "error", text: err.message || "Failed to delete course." });
                    }
                },
            },
        ]);
    };

    const pickVideo = async () => {
        // `MediaTypeOptions` is deprecated in favour of a MediaType array, and
        // `allowsEditing` is image cropping — it does nothing for video.
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["videos"],
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedVideo(result.assets[0]);
        }
    };

    const handleUpload = async () => {
        setUploadMsg(null);
        if (!selectedVideo) {
            setUploadMsg({ type: "error", text: "Please select a video file." });
            return;
        }
        if (!uploadTitle.trim()) {
            setUploadMsg({ type: "error", text: "Title is required." });
            return;
        }

        // The server requires orderInCourse, so it always has to be sent.
        // Default a blank field to the next position rather than omitting it,
        // which the server rejects with a 400.
        const orderNum = uploadOrder.trim() === "" ? videos.length + 1 : Number(uploadOrder);
        if (!Number.isFinite(orderNum) || orderNum < 0) {
            setUploadMsg({ type: "error", text: "Order must be a positive number." });
            return;
        }

        const formData = new FormData();
        formData.append("courseId", id);
        formData.append("title", uploadTitle.trim());
        if (uploadDesc.trim()) formData.append("description", uploadDesc.trim());
        formData.append("orderInCourse", String(orderNum));

        // Append file
        formData.append("mediaFile", {
            uri: selectedVideo.uri,
            type: selectedVideo.mimeType || "video/mp4",
            name: selectedVideo.fileName || "video.mp4",
        } as any);

        try {
            setIsUploading(true);
            await api.upload("/teacher/video/upload", formData);
            setUploadMsg({ type: "success", text: "Video uploaded successfully." });
            // Reset upload form
            setSelectedVideo(null);
            setUploadTitle("");
            setUploadDesc("");
            setUploadOrder("");
            fetchVideos();
        } catch (err: any) {
            let errorText = "Failed to upload video.";
            if (err.status === 400) errorText = "Missing required fields.";
            if (err.status === 403) errorText = "Not authorized to upload to this course.";
            if (err.status === 500) errorText = "Server processing failed.";
            setUploadMsg({ type: "error", text: err.message || errorText });
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <LoadingState />;
    if (errorMsg || !course) {
        return (
            <Screen>
                <EmptyState title="Course Not Found" description={errorMsg || "Could not load course."} actionLabel="Go Back" onAction={() => router.back()} />
            </Screen>
        );
    }

    return (
        <Screen edges={["bottom"]}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                
                {/* Course Details Form */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Course Details</Text>
                    {updateMsg && <Banner tone={updateMsg.type} message={updateMsg.text} />}
                    <Card style={styles.card}>
                        <View style={styles.formGroup}>
                            <TextField label="Course Name" value={name} onChangeText={setName} />
                            <TextField label="Description" value={description} onChangeText={setDescription} multiline />
                            <TextField label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />
                            <Button label="Save Changes" onPress={handleUpdate} loading={isUpdating} disabled={isUpdating} />
                        </View>
                    </Card>
                </View>

                {/* Videos List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Course Videos</Text>
                    {videosError ? <Banner tone="error" message={videosError} /> : null}
                    {isLoadingVideos ? (
                        <LoadingState fullscreen={false} />
                    ) : videos.length === 0 ? (
                        <EmptyState title="No Videos" description="Upload a video to get started." />
                    ) : (
                        <View style={styles.videoList}>
                            {videos.map((v, i) => (
                                <Card key={v._id} style={styles.videoCard}>
                                    <Text style={styles.videoTitle}>{i + 1}. {v.title}</Text>
                                    <Text style={styles.videoMeta}>
                                        Order: {v.metadata?.orderInCourse ?? "None"} | {v.metadata?.videolength ?? "Unknown"}
                                    </Text>
                                </Card>
                            ))}
                        </View>
                    )}
                </View>

                {/* Upload Form */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Upload Video</Text>
                    {uploadMsg && <Banner tone={uploadMsg.type} message={uploadMsg.text} />}
                    <Card style={styles.card}>
                        <View style={styles.formGroup}>
                            <Button
                                label={selectedVideo ? "Video Selected (Tap to change)" : "Select Video"}
                                variant={selectedVideo ? "secondary" : "primary"}
                                onPress={pickVideo}
                                disabled={isUploading}
                            />
                            {selectedVideo && (
                                <>
                                    <TextField label="Title" value={uploadTitle} onChangeText={setUploadTitle} />
                                    <TextField label="Description" value={uploadDesc} onChangeText={setUploadDesc} multiline />
                                    <TextField label="Order in Course" value={uploadOrder} onChangeText={setUploadOrder} keyboardType="numeric" />
                                    <Button
                                        label={isUploading ? "Uploading... (This may take a while)" : "Upload Video"}
                                        onPress={handleUpload}
                                        loading={isUploading}
                                        disabled={isUploading}
                                    />
                                </>
                            )}
                        </View>
                    </Card>
                </View>

                <View style={styles.dangerZone}>
                    <Button label="Delete Course" variant="danger" onPress={handleDelete} />
                </View>

            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: theme.spacing.lg,
        gap: theme.spacing.xxxl,
    },
    section: {
        gap: theme.spacing.md,
    },
    sectionTitle: {
        ...theme.type.heading,
        color: theme.colors.textPrimary,
    },
    card: {
        padding: theme.spacing.lg,
    },
    formGroup: {
        gap: theme.spacing.lg,
    },
    videoList: {
        gap: theme.spacing.sm,
    },
    videoCard: {
        padding: theme.spacing.md,
    },
    videoTitle: {
        ...theme.type.body,
        fontWeight: "600",
        color: theme.colors.textPrimary,
    },
    videoMeta: {
        ...theme.type.caption,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    dangerZone: {
        marginTop: theme.spacing.lg,
    },
});
