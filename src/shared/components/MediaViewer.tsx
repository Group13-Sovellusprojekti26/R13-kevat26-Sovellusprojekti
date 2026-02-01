import React, { useState } from 'react';
import { Modal, View, Pressable, Text, StyleSheet, ActivityIndicator, Image, ScrollView, Dimensions } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * Props for the MediaViewer component
 */
interface MediaViewerProps {
  /** Array of image URLs to display */
  imageUrls: string[];
  /** Whether the viewer is visible */
  visible: boolean;
  /** Callback to close the viewer */
  onClose: () => void;
  /** Initial index to display (default: 0) */
  initialIndex?: number;
}

/**
 * Reusable media viewer component for displaying zoomable images.
 * Provides consistent image viewing experience across the application.
 * Used by: FaultReportCard, FaultReportDetailsScreen, announcements
 * 
 * Features:
 * - Full-screen image display
 * - Swipe to navigate between images
 * - Touch close button
 * - Consistent Material Design 3 styling
 * - Supports multiple images with navigation
 * - Loading indicator while image loads
 */
export const MediaViewer: React.FC<MediaViewerProps> = ({
  imageUrls,
  visible,
  onClose,
  initialIndex = 0,
}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.viewerContainer}>
        {imageUrls.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            scrollEventThrottle={16}
            style={{ width: screenWidth, height: screenHeight }}
            scrollEnabled={imageUrls.length > 1}
            onScroll={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const currentPage = Math.round(contentOffsetX / screenWidth);
              setCurrentIndex(currentPage);
            }}
            showsHorizontalScrollIndicator={false}
          >
            {imageUrls.map((url, index) => (
              <View
                key={index}
                style={{
                  width: screenWidth,
                  height: screenHeight,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={{ uri: url }}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                  onError={(error) => {
                    console.error('Image load error:', error);
                    setIsLoading(false);
                  }}
                />
                {isLoading && (
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                    style={styles.loadingIndicator}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={{ color: '#fff' }}>No images available</Text>
        )}

        {/* Image counter */}
        {imageUrls.length > 1 && (
          <View style={[styles.counterContainer, { backgroundColor: theme.colors.scrim }]}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {imageUrls.length}
            </Text>
          </View>
        )}

        {/* Close button */}
        <Pressable
          style={[styles.viewerClose, { backgroundColor: theme.colors.scrim }]}
          onPress={onClose}
          accessibilityLabel="Close viewer"
        >
          <Text style={styles.viewerCloseText}>✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
  },
  counterContainer: {
    position: 'absolute',
    bottom: 50,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  viewerCloseText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
