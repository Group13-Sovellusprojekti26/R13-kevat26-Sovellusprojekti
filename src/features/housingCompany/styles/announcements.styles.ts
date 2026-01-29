import { StyleSheet, Dimensions } from 'react-native';
import { spacing, borderRadius } from '@/app/theme/theme';

/**
 * Unified styles for announcement features (Create, Edit, List)
 * Used by: CreateAnnouncementScreen, EditAnnouncementScreen, AnnouncementsListScreen
 * Best practice: All announcement-related styles in one place for consistency
 */

export const createAnnouncementStyles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.sm,
  },
  typeField: {
    justifyContent: 'center',
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  counter: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  fieldLabel: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  checkboxBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  checkboxLabel: {
    marginLeft: spacing.md,
    flex: 1,
  },
  submitButton: {
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    minHeight: 280,
    maxHeight: Dimensions.get('window').height * 0.85,
    flexShrink: 0,
  },
  modalOption: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: spacing.sm,
  },
});

export const editAnnouncementStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.sm,
  },
  typeField: {
    justifyContent: 'center',
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  counter: {
    marginBottom: spacing.lg,
    opacity: 0.6,
  },
  fieldLabel: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  checkboxBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  checkboxLabel: {
    marginLeft: spacing.md,
    flex: 1,
  },
  metadata: {
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: borderRadius.sm,
  },
  submitButton: {
    marginBottom: spacing.md,
  },
  deleteButton: {
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    minHeight: 280,
    maxHeight: Dimensions.get('window').height * 0.85,
    flexShrink: 0,
  },
  modalOption: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: spacing.sm,
  },
});

export const announcementsListStyles = StyleSheet.create({
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainerStyle: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
  },
  toggleButton: {
    marginBottom: spacing.lg,
  },
});

export const announcementDetailStyles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    marginBottom: spacing.md,
    flex: 1,
  },
  title: {
    marginBottom: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  type: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  metadataSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
  },
  dateColumn: {
    flex: 1,
  },
  contentSection: {
    paddingHorizontal: spacing.sm,
  },
  attachmentsSection: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  attachmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  attachmentInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
});

export const announcementCardStyles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publisherInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  typeText: {
    fontWeight: '500',
  },
  type: {
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  content: {
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  dateItem: {
    flex: 1,
  },
  attachmentIndicator: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
});

/**
 * Styles for AnnouncementsListScreen (used by all roles)
 */
export const announcementsListScreenStyles = StyleSheet.create({
  createButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listContentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  segmentedButtons: {
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    minHeight: 300,
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
  },
  modalTitle: {
    marginBottom: spacing.lg,
  },
  modalSectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  checkboxLabel: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  modalCloseButton: {
    marginTop: spacing.lg,
  },
});
