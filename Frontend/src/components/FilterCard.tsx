import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface FilterCardProps {
  title: string;
  active?: boolean;
  onPress?: () => void;
}

export default function FilterCard({ title, active = false, onPress }: FilterCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.item, active ? styles.activeItem : styles.inactiveItem]}
    >
      <Text
        style={[styles.title, active ? styles.activeTitle : styles.inactiveTitle]}
        numberOfLines={1}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginRight: 8,
  },
  activeItem: {
    backgroundColor: '#FF8383',
    borderColor: '#FF8383',
  },
  inactiveItem: {
    backgroundColor: '#fff',
    borderColor: '#555',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activeTitle: {
    color: '#fff',
  },
  inactiveTitle: {
    color: '#555',
  },
});
