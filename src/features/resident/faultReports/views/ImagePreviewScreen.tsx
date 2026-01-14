import React, { useRef, useState } from 'react';
import { View, Dimensions, StyleSheet, Text, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';

const { width, height } = Dimensions.get('window');

export const ImagePreviewScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { images, index } = route.params;

  const imageUrls = images.map((url: string) => ({ url }));
  const [current, setCurrent] = useState(index);

  return (
    <View style={styles.container}>
      <ImageViewer
        imageUrls={imageUrls}
        index={index}
        enableSwipeDown
        onSwipeDown={() => navigation.goBack()}
        onChange={(i) => i !== undefined && setCurrent(i)}
        renderIndicator={() => (
          <Text style={styles.indicator}>
            {current + 1} / {images.length}
          </Text>
        )}
        saveToLocalByLongPress={false}
      />

      <Pressable style={styles.close} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  indicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    color: 'white',
    fontSize: 16,
  },
  close: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
  },
  closeText: {
    color: 'white',
    fontSize: 24,
  },
});
