import { create } from 'zustand';
import { DocumentSnapshot } from 'firebase/firestore';
import {
  getActiveAnnouncementsByHousingCompany,
  getExpiredAnnouncementsByHousingCompany,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementAttachment,
  updateAnnouncementWithAttachments,
  deleteAnnouncementAttachmentFile,
} from '@/data/repositories/announcements.repo';
import { getUserProfile } from '@/data/repositories/users.repo';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { Announcement, CreateAnnouncementInput } from '@/data/models/Announcement';
import { AnnouncementType } from '@/data/models/enums';
import { AppError } from '@/shared/utils/errors';
import type { UploadAttachmentParams, UploadAttachmentResponse } from '@/shared/types/announcementAttachments.types';

/**
 * State interface for announcements view model using Zustand.
 * Manages announcements data, filtering, pagination, and CRUD operations.
 * Supports simultaneous pagination cursors for active and expired announcements.
 * Type filtering allows users to display only specific announcement categories.
 * 
 * @interface AnnouncementsState
 * @property {Announcement[]} announcements - Currently displayed announcements (active or expired based on showExpired flag)
 * @property {boolean} showExpired - Toggle between active and expired announcements
 * @property {AnnouncementType[]} selectedTypes - Array of announcement types to filter by (empty = none)
 * @property {boolean} loading - Whether initial fetch is in progress
 * @property {boolean} loadingMore - Whether pagination load is in progress
 * @property {boolean} hasMore - Whether more announcements are available to load
 * @property {string | null} error - Current error message (null if no error)
 * @property {DocumentSnapshot | null} activeLastDoc - Cursor for active announcements pagination
 * @property {DocumentSnapshot | null} expiredLastDoc - Cursor for expired announcements pagination
 * @property {number} pageLimit - Maximum announcements per page (default: 10)
 * @property {Function} fetchAnnouncements - Reset and fetch first page of announcements
 * @property {Function} loadMore - Load next page using cursor-based pagination
 * @property {Function} toggleShowExpired - Switch between active and expired announcements
 * @property {Function} toggleTypeFilter - Add/remove single type from filter
 * @property {Function} setSelectedTypes - Replace entire type filter with new types
 * @property {Function} createAnnouncement - Create new announcement via Cloud Function
 * @property {Function} updateAnnouncement - Update announcement fields
 * @property {Function} deleteAnnouncement - Delete announcement via Cloud Function
 * @property {Function} clearError - Reset error state to null
 */
interface AnnouncementsState {
  announcements: Announcement[];
  showExpired: boolean;
  selectedTypes: AnnouncementType[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  
  // Pagination cursors
  activeLastDoc: DocumentSnapshot | null;
  expiredLastDoc: DocumentSnapshot | null;
  pageLimit: number;
  
  /**
   * Reset announcements state and fetch initial page of active announcements.
   * Clears all pagination cursors and error state.
   * Shows loading state during fetch.
   * 
   * @async
   * @param {string} housingCompanyId - Housing company to fetch announcements for
   * @returns {Promise<void>}
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * await vm.fetchAnnouncements("hc_123");
   * console.log(vm.announcements.length); // First page announcements
   */
  fetchAnnouncements: (housingCompanyId: string) => Promise<void>;
  /**
   * Load next page of announcements using cursor-based pagination.
   * Prevents multiple concurrent requests (checks loadingMore flag).
   * Appends new announcements to existing list rather than replacing.
   * Updates cursor for next page. Sets hasMore to false when no more pages available.
   * 
   * @async
   * @param {string} housingCompanyId - Housing company to fetch announcements for
   * @returns {Promise<void>}
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * if (vm.hasMore) {
   *   await vm.loadMore("hc_123");
   * }
   */
  loadMore: (housingCompanyId: string) => Promise<void>;
  /**
   * Toggle between showing active and expired announcements.
   * Resets pagination cursors and fetches first page of toggled view.
   * Optional parameter allows forced setting rather than toggle.
   * 
   * @param {boolean} [showExpired] - Optional: if true show expired, if false show active, if undefined toggle
   * @returns {void}
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * vm.toggleShowExpired(); // Toggle to opposite view
   * vm.toggleShowExpired(true); // Force show expired
   * vm.toggleShowExpired(false); // Force show active
   */
  toggleShowExpired: (showExpired?: boolean) => void;
  /**
   * Toggle single announcement type in filter.
   * If type is already selected, removes it; otherwise adds it.
   * Calls setSelectedTypes internally to trigger re-fetch with new filter.
   * 
   * @param {AnnouncementType} type - Announcement type to toggle
   * @returns {void}
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * vm.toggleTypeFilter(AnnouncementType.MAINTENANCE);
   * // If MAINTENANCE was not selected, now it is; if it was, now it's removed
   */
  toggleTypeFilter: (type: AnnouncementType) => void;
  /**
   * Replace entire type filter with new selection.
   * Resets pagination and fetches first page with new filter applied.
   * Results are filtered client-side by comparing announcement.type with selectedTypes array.
   * 
   * @param {AnnouncementType[]} types - New array of types to show (empty array = show none)
   * @returns {void}
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * vm.setSelectedTypes([AnnouncementType.GENERAL, AnnouncementType.MAINTENANCE]);
   * // Only show announcements of these two types
   */
  setSelectedTypes: (types: AnnouncementType[]) => void;
  /**
   * Create new announcement via Cloud Function.
   * Automatically refreshes announcements list after successful creation.
   * Sets loading state and handles errors with user-friendly messages.
   * 
   * @async
   * @param {CreateAnnouncementInput} input - Announcement creation data
   * @returns {Promise<void>}
   * @throws {AppError} If creation fails due to permission or validation errors
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * try {
   *   await vm.createAnnouncement({
   *     title: "Building News",
   *     content: "Important update",
   *     type: AnnouncementType.GENERAL,
   *     endDate: new Date("2024-12-31")
   *   });
   * } catch (error) {
   *   console.log(vm.error); // User-friendly error message
   * }
   */
  createAnnouncement: (input: CreateAnnouncementInput) => Promise<void>;
  /**
   * Update announcement fields.
   * Performs optimistic update to local state immediately.
   * If announcement is deleted by another user, removes it from local state and shows error.
   * Updates new updatedAt timestamp in local state.
   * 
   * @async
   * @param {string} id - Announcement ID to update
   * @param {Object} updates - Fields to update (all optional, omitted fields unchanged)
   * @returns {Promise<void>}
   * @throws {AppError} If update fails or announcement not found
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * await vm.updateAnnouncement("ann_123", {
   *   title: "Updated Title",
   *   isPinned: true
   * });
   */
  updateAnnouncement: (
    id: string,
    updates: {
      title?: string;
      content?: string;
      type?: AnnouncementType;
      isPinned?: boolean;
      startDate?: Date;
      startTime?: string | null;
      endDate?: Date;
      endTime?: string | null;
    }
  ) => Promise<void>;
  /**
   * Delete announcement via Cloud Function.
   * Optimistically removes from local state immediately.
   * If already deleted by another user, shows appropriate error message.
   * 
   * @async
   * @param {string} id - Announcement ID to delete
   * @returns {Promise<void>}
   * @throws {AppError} If deletion fails or announcement not found
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * try {
   *   await vm.deleteAnnouncement("ann_123");
   * } catch (error) {
   *   // Handle error
   * }
   */
  deleteAnnouncement: (id: string) => Promise<void>;
  /**
   * Clear error state by setting it to null.
   * Useful for dismissing error messages after user has seen them.
   * 
   * @returns {void}
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * if (vm.error) {
   *   // Show error to user
   *   vm.clearError();
   * }
   */
  clearError: () => void;
  /**
   * Upload an attachment file for an announcement.
   * Handles file upload to Cloud Storage via Cloud Function.
   * Returns attachment ID for use in createAnnouncement or updateAnnouncementWithAttachments.
   * 
   * @async
   * @param {UploadAttachmentParams} params - File parameters (fileName, size, mimeType, base64)
   * @returns {Promise<UploadAttachmentResponse>} Upload response with attachmentId and downloadUrl
   * @throws {AppError} If upload fails due to size limit, file type, or permission errors
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * const response = await vm.uploadAttachment({
   *   fileName: 'document.pdf',
   *   size: 2048000,
   *   mimeType: 'application/pdf',
   *   base64: 'JVBERi0xLjQK...'
   * });
   * // Can now use response.attachmentId in createAnnouncement
   */
  uploadAttachment: (params: UploadAttachmentParams) => Promise<UploadAttachmentResponse>;
  /**
   * Delete an attachment file from Storage.
   * Removes the file when user removes it from UI before announcement creation.
   * Non-critical - errors are silently logged.
   * 
   * @async
   * @param {string} attachmentId - Attachment ID to delete
   * @returns {Promise<void>}
   * 
   * @example
   * const vm = useAnnouncementsVM();
   * await vm.deleteAttachment(attachmentId);
   */
  deleteAttachment: (attachmentId: string) => Promise<void>;

  /**
   * Upload announcement attachments sequentially and collect their IDs.
   * Refreshes user token before upload to ensure auth is valid.
   */
  uploadAttachments: (attachments: Array<{
    fileName: string;
    mimeType: string;
    size: number;
    base64: string;
  }>) => Promise<string[]>;

  /**
   * Update announcement with new and removed attachments.
   * Calls Cloud Function to attach files and remove old ones.
   */
  updateAttachments: (
    announcementId: string,
    allAttachmentIds: string[],
    removeAttachmentIds?: string[]
  ) => Promise<void>;

  /**
   * Calculate removed attachment IDs by comparing existing and remaining attachments.
   */
  getRemoveAttachmentIds: (originalAttachments: any[], remainingAttachments: any[]) => string[];
}

/**
 * Zustand store hook for managing announcements state and operations.
 * Provides unified CRUD interface for announcements with cursor-based pagination and type filtering.
 * Maintains separate pagination cursors for active and expired announcements.
 * Integrates with Firebase repositories for data persistence.
 * Handles role-based errors via Cloud Functions and AppError utility.
 * 
 * @hook useAnnouncementsVM
 * @returns {AnnouncementsState} Store with state and action methods
 * 
 * @example
 * // In a React component
 * const vm = useAnnouncementsVM();
 * 
 * useEffect(() => {
 *   vm.fetchAnnouncements(housingCompanyId);
 * }, [housingCompanyId, vm]);
 * 
 * return (
 *   <FlatList
 *     data={vm.announcements}
 *     renderItem={...}
 *     onEndReached={() => vm.loadMore(housingCompanyId)}
 *   />
 * );
 */
export const useAnnouncementsVM = create<AnnouncementsState>((set, get) => ({
  announcements: [],
  showExpired: false,
  selectedTypes: Object.values(AnnouncementType),
  loading: false,
  loadingMore: false,
  hasMore: true,
  error: null,
  activeLastDoc: null,
  expiredLastDoc: null,
  pageLimit: 10,

  /**
   * Fetch initial announcements (reset pagination)
   * Loads first page of active or expired announcements
   */
  fetchAnnouncements: async (housingCompanyId: string) => {
    set({ loading: true, error: null, showExpired: false, announcements: [], activeLastDoc: null, expiredLastDoc: null });
    try {
      const result = await getActiveAnnouncementsByHousingCompany(housingCompanyId, get().pageLimit);
      set({ 
        announcements: result.announcements,
        activeLastDoc: result.lastDoc,
        hasMore: result.lastDoc !== null,
        loading: false 
      });
    } catch (err) {
      const error =
        err instanceof AppError
          ? err.message
          : 'announcements.fetchFailed';
      set({ error, loading: false });
    }
  },

  /**
   * Toggle between active and expired announcements view
   */
  toggleShowExpired: (showExpired?: boolean) => {
    const current = get();
    const newShowExpired = showExpired !== undefined ? showExpired : !current.showExpired;
    set({ showExpired: newShowExpired, announcements: [], loading: true });
    
    // Fetch first page of the toggled view
    const profile = getUserProfile().then(p => {
      if (p) {
        const state = get();
        const fetchFn = newShowExpired
          ? getExpiredAnnouncementsByHousingCompany
          : getActiveAnnouncementsByHousingCompany;
        
        fetchFn(p.housingCompanyId, state.pageLimit)
          .then(result => {
            set({ 
              announcements: result.announcements,
              [newShowExpired ? 'expiredLastDoc' : 'activeLastDoc']: result.lastDoc,
              hasMore: result.lastDoc !== null,
              loading: false 
            });
          })
          .catch(err => {
            const error =
              err instanceof AppError
                ? err.message
                : 'announcements.fetchFailed';
            set({ error, loading: false });
          });
      }
    });
  },

  /**
   * Toggle type filter for announcements
   * If type is already selected, remove it; otherwise add it
   */
  toggleTypeFilter: (type: AnnouncementType) => {
    const { selectedTypes } = get();
    const newSelectedTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    get().setSelectedTypes(newSelectedTypes);
  },

  /**
   * Set selected announcement types filter
   * Resets pagination and fetches with new filter
   */
  setSelectedTypes: (types: AnnouncementType[]) => {
    set({ selectedTypes: types, announcements: [], loading: true, activeLastDoc: null, expiredLastDoc: null });
    
    const profile = getUserProfile().then(p => {
      if (p) {
        const state = get();
        const fetchFn = state.showExpired
          ? getExpiredAnnouncementsByHousingCompany
          : getActiveAnnouncementsByHousingCompany;
        
        // Filter results by selected types
        fetchFn(p.housingCompanyId, state.pageLimit)
          .then(result => {
            const filteredAnnouncements = result.announcements.filter(a => 
              state.selectedTypes.includes(a.type)
            );
            set({ 
              announcements: filteredAnnouncements,
              [state.showExpired ? 'expiredLastDoc' : 'activeLastDoc']: result.lastDoc,
              hasMore: result.lastDoc !== null,
              loading: false 
            });
          })
          .catch(err => {
            const error =
              err instanceof AppError
                ? err.message
                : 'announcements.fetchFailed';
            set({ error, loading: false });
          });
      }
    });
  },

  /**
   * Load more announcements using cursor-based pagination
   */
  loadMore: async (housingCompanyId: string) => {
    const { loadingMore, hasMore, showExpired, announcements, pageLimit, activeLastDoc, expiredLastDoc } = get();
    
    // Prevent multiple concurrent requests or if no more data
    if (loadingMore || !hasMore) {
      return;
    }

    set({ loadingMore: true, error: null });
    try {
      const fetchFn = showExpired
        ? getExpiredAnnouncementsByHousingCompany
        : getActiveAnnouncementsByHousingCompany;
      
      const lastDoc = showExpired ? expiredLastDoc : activeLastDoc;
      const result = await fetchFn(housingCompanyId, pageLimit, lastDoc ?? undefined);
      
      set((state) => ({
        announcements: [...state.announcements, ...result.announcements],
        [showExpired ? 'expiredLastDoc' : 'activeLastDoc']: result.lastDoc,
        hasMore: result.lastDoc !== null,
        loadingMore: false,
      }));
    } catch (err) {
      const error =
        err instanceof AppError
          ? err.message
          : 'announcements.loadMoreFailed';
      set({ error, loadingMore: false });
    }
  },

  /**
   * Create a new announcement
   */
  createAnnouncement: async (input: CreateAnnouncementInput) => {
    set({ loading: true, error: null });
    try {
      await createAnnouncement(input);
      // Reset and refresh the list after creation
      const profile = await getUserProfile();
      if (profile) {
        await get().fetchAnnouncements(profile.housingCompanyId);
      }
      set({ loading: false });
    } catch (err: any) {
      let errorMsg = 'announcements.createFailed';
      
      if (err instanceof AppError) {
        errorMsg = err.message;
      } else if (err?.code === 'functions/permission-denied') {
        errorMsg = 'announcements.permissionDenied';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  /**
   * Update an existing announcement
   */
  updateAnnouncement: async (
    id: string,
    updates: {
      title?: string;
      content?: string;
      type?: AnnouncementType;
      isPinned?: boolean;
      startDate?: Date;
      startTime?: string | null;
      endDate?: Date;
      endTime?: string | null;
    }
  ) => {
    set({ loading: true, error: null });
    try {
      await updateAnnouncement(id, updates);

      // Optimistic update to local state
      set((state) => ({
        announcements: state.announcements.map((a) =>
          a.id === id
            ? {
                ...a,
                title: updates.title ?? a.title,
                content: updates.content ?? a.content,
                updatedAt: new Date(),
              }
            : a
        ),
        loading: false,
      }));
    } catch (err: any) {
      let errorMsg = 'announcements.updateFailed';
      
      if (err instanceof AppError) {
        errorMsg = err.message;
        if (err.code === 'not-found') {
          set((state) => ({
            announcements: state.announcements.filter((a) => a.id !== id),
            error: 'announcements.deletedByOther',
            loading: false,
          }));
          throw err;
        }
      } else if (err?.code === 'functions/not-found' || err?.message?.includes('not-found')) {
        set((state) => ({
          announcements: state.announcements.filter((a) => a.id !== id),
          error: 'announcements.deletedByOther',
          loading: false,
        }));
        throw err;
      }
      
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  /**
   * Delete an announcement
   */
  deleteAnnouncement: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteAnnouncement(id);

      // Remove from local state
      set((state) => ({
        announcements: state.announcements.filter((a) => a.id !== id),
        loading: false,
      }));
    } catch (err: any) {
      let errorMsg = 'announcements.deleteFailed';
      
      if (err instanceof AppError) {
        errorMsg = err.message;
        if (err.code === 'not-found') {
          set((state) => ({
            announcements: state.announcements.filter((a) => a.id !== id),
            error: 'announcements.alreadyDeleted',
            loading: false,
          }));
          throw err;
        }
      } else if (err?.code === 'functions/not-found' || err?.message?.includes('not-found')) {
        set((state) => ({
          announcements: state.announcements.filter((a) => a.id !== id),
          error: 'announcements.alreadyDeleted',
          loading: false,
        }));
        throw err;
      }
      
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => set({ error: null }),

  /**
   * Upload an attachment file
   */
  uploadAttachment: async (params: UploadAttachmentParams) => {
    try {
      const response = await uploadAnnouncementAttachment(params);
      return response;
    } catch (err: any) {
      let errorMsg = 'announcements.attachmentUploadFailed';
      
      if (err instanceof AppError) {
        errorMsg = err.message;
      } else if (err?.code === 'functions/permission-denied') {
        errorMsg = 'announcements.permissionDenied';
      } else if (err?.code === 'functions/resource-exhausted') {
        errorMsg = 'announcements.fileTooLarge';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      set({ error: errorMsg });
      throw err;
    }
  },

  /**
   * Delete an attachment file from Storage.
   * Used when user removes attachments before announcement creation.
   */
  deleteAttachment: async (attachmentId: string) => {
    try {
      await deleteAnnouncementAttachmentFile(attachmentId);
    } catch (err: any) {
      console.error('Delete attachment error:', err);
      // Non-critical error - don't set global error state
    }
  },

  /**
   * Upload announcement attachments sequentially and collect their IDs.
   * Refreshes user token before upload to ensure auth is valid.
   */
  uploadAttachments: async (attachments: Array<{
    fileName: string;
    mimeType: string;
    size: number;
    base64: string;
  }>): Promise<string[]> => {
    const newAttachmentIds: string[] = [];

    if (attachments.length === 0) {
      return newAttachmentIds;
    }

    // Refresh token before upload
    const user = getCurrentUser();
    if (user) {
      await user.getIdToken(true);
    }

    // Upload attachments sequentially
    for (const att of attachments) {
      const uploadResult = await uploadAnnouncementAttachment({
        fileName: att.fileName,
        size: att.size,
        mimeType: att.mimeType,
        base64: att.base64,
      });
      newAttachmentIds.push(uploadResult.attachmentId);
    }

    return newAttachmentIds;
  },

  /**
   * Update announcement with new and removed attachments.
   * Calls Cloud Function to attach files and remove old ones.
   */
  updateAttachments: async (
    announcementId: string,
    allAttachmentIds: string[],
    removeAttachmentIds?: string[]
  ): Promise<void> => {
    if (allAttachmentIds.length === 0 && !removeAttachmentIds?.length) {
      return; // No changes needed
    }

    await updateAnnouncementWithAttachments(announcementId, allAttachmentIds, removeAttachmentIds);
  },

  /**
   * Calculate removed attachment IDs by comparing existing and remaining attachments.
   */
  getRemoveAttachmentIds: (originalAttachments: any[], remainingAttachments: any[]): string[] => {
    const remainingIds = new Set(remainingAttachments.map(att => att.id));
    return originalAttachments
      .map(att => att.id)
      .filter(id => !remainingIds.has(id));
  },
}));
