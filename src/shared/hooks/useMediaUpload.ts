import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { haptic } from '@/shared/utils/haptics';

/**
 * Represents a media file ready for upload
 */
export interface MediaFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  base64: string;
}

/**
 * Configuration for media upload behavior
 */
interface MediaUploadConfig {
  /** Maximum file size in bytes (default: 10 MB) */
  maxFileSize?: number;
  /** Maximum number of files allowed (default: 10) */
  maxFiles?: number;
  /** Allowed MIME types (default: common images and PDF) */
  allowedTypes?: string[];
  /** Image quality 0-1 (default: 0.8) */
  imageQuality?: number;
}

/**
 * Hook for handling media upload with image picker and document picker.
 * Abstracts common logic for picking images and documents with validation.
 * 
 * Features:
 * - Image picking with compression via ImagePicker
 * - PDF document picking via DocumentPicker
 * - File size and type validation
 * - Maximum file count validation
 * - Base64 encoding for upload
 * - Error handling with user feedback (haptics + alerts)
 * - Customizable constraints (max size, file count, allowed types)
 * 
 * @param {MediaUploadConfig} config - Configuration options
 * @returns {Object} Hook state and methods
 * @returns {MediaFile[]} media - Array of selected media files
 * @returns {boolean} loading - Whether a file picker is open
 * @returns {Function} pickImage - Pick image from library
 * @returns {Function} pickDocument - Pick PDF document
 * @returns {Function} removeMedia - Remove a media file by ID
 * @returns {Function} clearMedia - Clear all media files
 * 
 * @example
 * const {
 *   media,
 *   pickImage,
 *   pickDocument,
 *   removeMedia,
 *   clearMedia,
 * } = useMediaUpload({
 *   maxFileSize: 5 * 1024 * 1024, // 5 MB
 *   maxFiles: 5,
 *   allowedTypes: ['image/jpeg', 'image/png'],
 * });
 */
export function useMediaUpload(config: MediaUploadConfig = {}) {
  const { t } = useTranslation();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    maxFileSize = 10 * 1024 * 1024, // 10 MB
    maxFiles = 10,
    allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'],
    imageQuality = 0.8,
  } = config;

  /**
   * Validates and adds a media file to the list
   */
  const addMedia = useCallback(
    (fileName: string, base64: string, mimeType: string) => {
      try {
        // Check file count
        if (media.length >= maxFiles) {
          haptic.error();
          Alert.alert(
            t('common.attachmentLimit'),
            t('common.maxFilesReached', { max: maxFiles })
          );
          return false;
        }

        // Check file type
        if (!allowedTypes.includes(mimeType)) {
          haptic.error();
          Alert.alert(
            t('common.invalidFileType'),
            t('common.fileTypeNotAllowed')
          );
          return false;
        }

        // Check file size (base64 encoding adds ~33% overhead)
        const estimatedSize = Math.ceil((base64.length * 3) / 4);
        if (estimatedSize > maxFileSize) {
          haptic.error();
          const maxMB = (maxFileSize / 1024 / 1024).toFixed(0);
          Alert.alert(
            t('common.fileTooLarge'),
            t('common.fileSizeExceeded', { max: `${maxMB} MB` })
          );
          return false;
        }

        // Create unique ID
        const id = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add to list
        const newMedia: MediaFile = {
          id,
          fileName,
          mimeType,
          size: estimatedSize,
          base64,
        };

        setMedia(prev => [...prev, newMedia]);
        haptic.success();
        return true;
      } catch (error) {
        console.error('Error adding media:', error);
        haptic.error();
        Alert.alert(t('common.error'), t('common.mediaAddFailed'));
        return false;
      }
    },
    [media.length, maxFiles, allowedTypes, maxFileSize, t]
  );

  /**
   * Pick image from device library
   */
  const pickImage = useCallback(async () => {
    if (media.length >= maxFiles) {
      haptic.error();
      Alert.alert(
        t('common.attachmentLimit'),
        t('common.maxFilesReached', { max: maxFiles })
      );
      return;
    }

    try {
      setLoading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        haptic.error();
        Alert.alert(
          t('common.error'),
          t('common.libraryPermissionDenied')
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: imageQuality,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image-${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        const base64 = asset.base64 || '';

        if (!base64) {
          haptic.error();
          Alert.alert(t('common.error'), t('common.imageBase64Missing'));
          return;
        }

        addMedia(fileName, base64, mimeType);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      haptic.error();
      Alert.alert(t('common.error'), t('common.imagePickFailed'));
    } finally {
      setLoading(false);
    }
  }, [media.length, maxFiles, imageQuality, addMedia, t]);

  /**
   * Pick PDF document from device
   */
  const pickDocument = useCallback(async () => {
    if (media.length >= maxFiles) {
      haptic.error();
      Alert.alert(
        t('common.attachmentLimit'),
        t('common.maxFilesReached', { max: maxFiles })
      );
      return;
    }

    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.name || 'document.pdf';
        const size = asset.size || 0;

        // Check size before reading
        if (size > maxFileSize) {
          haptic.error();
          const maxMB = (maxFileSize / 1024 / 1024).toFixed(0);
          Alert.alert(
            t('common.fileTooLarge'),
            t('common.fileSizeExceeded', { max: `${maxMB} MB` })
          );
          return;
        }

        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          // Convert blob to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1] || result;
              resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });

          addMedia(fileName, base64, 'application/pdf');
        } catch (error) {
          console.error('File read error:', error);
          haptic.error();
          Alert.alert(t('common.error'), t('common.documentReadFailed'));
        }
      }
    } catch (error) {
      console.error('Document picker error:', error);
      haptic.error();
      Alert.alert(t('common.error'), t('common.documentPickFailed'));
    } finally {
      setLoading(false);
    }
  }, [media.length, maxFiles, maxFileSize, addMedia, t]);

  /**
   * Remove a media file by ID
   */
  const removeMedia = useCallback((id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id));
    haptic.light();
  }, []);

  /**
   * Clear all media files
   */
  const clearMedia = useCallback(() => {
    setMedia([]);
  }, []);

  return {
    media,
    loading,
    pickImage,
    pickDocument,
    removeMedia,
    clearMedia,
  };
}
