import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 6,
  style,
}) => {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
};

export const CourseCardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardSkeleton}>
      <Skeleton width="100%" height={160} borderRadius={8} />
      <View style={styles.row}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.infoCol}>
          <Skeleton width="60%" height={14} borderRadius={4} />
          <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={60} height={28} borderRadius={10} />
      </View>
      <Skeleton width="80%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
      <Skeleton width="95%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#e0e0e0",
  },
  cardSkeleton: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e5e5",
    padding: 12,
    marginVertical: 8,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  infoCol: {
    flex: 1,
    marginLeft: 10,
  },
});
