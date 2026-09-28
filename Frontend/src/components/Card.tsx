import React, { useState } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StudentSVG from '../../assets/images/student.svg';
import { Course } from '../types/api';

interface CardProps {
  course: Course;
  onPress?: () => void;
  showEnrollmentStatus?: boolean;
}

export default function Card({ course, onPress, showEnrollmentStatus = true }: CardProps) {
  const [imageError, setImageError] = useState(false);

  const owner =
    typeof course.owner === 'object' && course.owner !== null
      ? course.owner
      : null;

  const ownerName = owner?.fullName || owner?.username || 'Instructor';
  const ownerUsername = owner?.username ? `@${owner.username}` : '';
  const price = course.price !== undefined ? course.price : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.cardContainer}
    >
      {/* Course Image Header */}
      <View style={styles.imageContainer}>
        {course.backgroundPic && !imageError ? (
          <Image
            source={{ uri: course.backgroundPic }}
            style={styles.courseImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Image
            source={require('../../assets/images/course.png')}
            style={styles.courseImage}
            resizeMode="cover"
          />
        )}

        {/* Floating status badges */}
        {showEnrollmentStatus && course.isEnrolled ? (
          <View style={styles.enrolledBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.enrolledBadgeText}>Enrolled</Text>
          </View>
        ) : null}

        <View style={styles.priceOverlayBadge}>
          <Text style={styles.priceOverlayText}>
            {price === 0 ? 'FREE' : `₹${price.toLocaleString()}`}
          </Text>
        </View>
      </View>

      {/* Instructor Row */}
      <View style={styles.instructorRow}>
        <View style={styles.avatarWrapper}>
          {owner?.profilePic ? (
            <Image
              source={{ uri: owner.profilePic }}
              style={styles.avatarImage}
            />
          ) : (
            <StudentSVG width="100%" height="100%" />
          )}
        </View>

        <View style={styles.instructorInfo}>
          <Text style={styles.instructorFullName} numberOfLines={1}>
            {ownerName}
          </Text>
          <Text style={styles.instructorUsername} numberOfLines={1}>
            {ownerUsername}
          </Text>
        </View>

        <View style={styles.studentBadge}>
          <Ionicons name="people-outline" size={13} color="#555" style={{ marginRight: 4 }} />
          <Text style={styles.studentBadgeText}>
            {course.enrolledStudentCount || 0}
          </Text>
        </View>
      </View>

      {/* Title & Description */}
      <View style={styles.contentSection}>
        <Text style={styles.courseTitle} numberOfLines={1}>
          {course.name}
        </Text>
        <Text style={styles.courseDescription} numberOfLines={2}>
          {course.courseDescription || 'No description provided.'}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.viewDetailsText}>
            {course.isEnrolled ? 'Continue Learning →' : 'View Course & Syllabus →'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    marginVertical: 9,
    padding: 12,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageContainer: {
    width: '100%',
    height: 175,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f2f2f2',
  },
  courseImage: {
    width: '100%',
    height: '100%',
  },
  enrolledBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  enrolledBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  priceOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceOverlayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f5ecec',
    borderWidth: 1,
    borderColor: '#555',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorFullName: {
    fontWeight: '600',
    fontSize: 14,
    color: '#222',
  },
  instructorUsername: {
    fontSize: 12,
    color: '#777',
  },
  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  studentBadgeText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  contentSection: {
    marginTop: 2,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f3f3',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8383',
  },
});