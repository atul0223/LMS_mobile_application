import { useState } from "react";
import { StyleSheet, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen, TextField, Button, Banner, Card } from "@/components";
import api from "@/lib/api";
import theme from "@/theme";

export default function NewCourseScreen() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState("");
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ name?: string; description?: string; price?: string }>({});

    const handleCreate = async () => {
        setGeneralError(null);
        setErrors({});

        // Client-side validation
        const newErrors: typeof errors = {};
        if (!name.trim()) newErrors.name = "Course name is required";
        if (!description.trim()) newErrors.description = "Course description is required";
        
        const priceNum = price ? parseFloat(price) : 0;
        if (price !== "" && (isNaN(priceNum) || priceNum < 0 || priceNum > 50000)) {
            newErrors.price = "Price must be a number between 0 and 50000";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await api.post<{ message: string; course: { _id: string } }>("/teacher/courses/create", {
                courseName: name.trim(),
                courseDescription: description.trim(),
                price: priceNum,
            });
            
            // Route to the new course's edit screen
            router.replace({
                pathname: "/(teacher)/course/[id]",
                params: { id: res.course._id }
            });
        } catch (err: any) {
            // The backend returns a single `message` for validation failures,
            // not per-field errors, so everything surfaces as a banner.
            if (err.status === 403) {
                setGeneralError("Your account is not allowed to create courses.");
            } else {
                setGeneralError(err.message || "Failed to create course.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Screen edges={["top", "bottom"]}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {generalError ? <Banner tone="error" message={generalError} /> : null}

                <Card style={styles.formCard}>
                    <View style={styles.formGroup}>
                        <TextField
                            label="Course Name"
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                setErrors(prev => ({ ...prev, name: undefined }));
                            }}
                            placeholder="Enter course name"
                            error={errors.name}
                        />
                        <TextField
                            label="Description"
                            value={description}
                            onChangeText={(text) => {
                                setDescription(text);
                                setErrors(prev => ({ ...prev, description: undefined }));
                            }}
                            placeholder="Enter description"
                            multiline
                            error={errors.description}
                        />
                        <TextField
                            label="Price (₹)"
                            value={price}
                            onChangeText={(text) => {
                                setPrice(text);
                                setErrors(prev => ({ ...prev, price: undefined }));
                            }}
                            placeholder="0 for free"
                            keyboardType="numeric"
                            error={errors.price}
                        />
                    </View>
                </Card>

                <Button
                    label="Create Course"
                    onPress={handleCreate}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                />
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        gap: theme.spacing.xl,
    },
    formCard: {
        padding: theme.spacing.lg,
    },
    formGroup: {
        gap: theme.spacing.lg,
    },
});
