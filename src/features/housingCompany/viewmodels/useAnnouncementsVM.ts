import { create } from 'zustand';
import {
  getAnnouncementsByHousingCompany,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/data/repositories/announcements.repo';
import { getUserProfile } from '@/data/repositories/users.repo';
import { Announcement, CreateAnnouncementInput } from '@/data/models/Announcement';
import { AnnouncementType } from '@/data/models/enums';
import { AppError } from '@/shared/utils/errors';

interface AnnouncementsState {
  announcements: Announcement[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  offset: number;
  limit: number;
  error: string | null;
  fetchAnnouncements: (housingCompanyId: string) => Promise<void>;
  loadMore: (housingCompanyId: string) => Promise<void>;
  createAnnouncement: (input: CreateAnnouncementInput) => Promise<void>;
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
  deleteAnnouncement: (id: string) => Promise<void>;
  clearError: () => void;
}

/**
 * ViewModel for managing announcements (Housing Company & Property Manager)
 * Handles CRUD operations with proper error handling for concurrent modifications
 */
export const useAnnouncementsVM = create<AnnouncementsState>((set, get) => ({
  announcements: [],
  loading: false,
  loadingMore: false,
  hasMore: true,
  offset: 0,
  limit: 10,
  error: null,

  /**
   * Fetch initial announcements (reset pagination)
   */
  fetchAnnouncements: async (housingCompanyId: string) => {
    set({ loading: true, error: null, offset: 0, announcements: [] });
    try {
      const announcements = await getAnnouncementsByHousingCompany(housingCompanyId);
      const limit = get().limit;
      const hasMore = announcements.length >= limit;
      set({ 
        announcements: announcements.slice(0, limit),
        hasMore,
        offset: limit,
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
   * Load more announcements (pagination)
   */
  loadMore: async (housingCompanyId: string) => {
    const { loadingMore, hasMore, offset, limit, announcements } = get();
    
    // Prevent multiple concurrent requests
    if (loadingMore || !hasMore) {
      return;
    }

    set({ loadingMore: true, error: null });
    try {
      const allAnnouncements = await getAnnouncementsByHousingCompany(housingCompanyId);
      const newBatch = allAnnouncements.slice(offset, offset + limit);
      
      // Only add new items (prevent duplicates)
      const newIds = new Set(newBatch.map(a => a.id));
      const existingIds = new Set(announcements.map(a => a.id));
      const uniqueNewItems = newBatch.filter(a => !existingIds.has(a.id));

      const hasMoreItems = offset + limit < allAnnouncements.length;
      
      set((state) => ({
        announcements: [...state.announcements, ...uniqueNewItems],
        hasMore: hasMoreItems,
        offset: offset + limit,
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
      throw err; // Re-throw so UI can handle it
    }
  },

  /**
   * Update an existing announcement
   * Handles concurrent deletion gracefully
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

      // Optimistic update lokaaliin tilaan
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
      // Handle concurrent deletion or not found
      let errorMsg = 'announcements.updateFailed';
      
      if (err instanceof AppError) {
        errorMsg = err.message;
        // If it's a "not found" error, remove from list
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
   * Handles concurrent deletion gracefully
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
      // Handle concurrent deletion or not found
      let errorMsg = 'announcements.deleteFailed';
      
      if (err instanceof AppError) {
        errorMsg = err.message;
        // Always remove from list if it's not found
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
}));
