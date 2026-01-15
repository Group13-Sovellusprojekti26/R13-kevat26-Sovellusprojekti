// Shared Firestore helpers for mapping and timestamp conversion
import { Timestamp } from 'firebase/firestore';

/**
 * Convert Firestore Timestamp to JS Date
 */
export function timestampToDate(timestamp?: Timestamp): Date | undefined {
  return timestamp instanceof Timestamp ? timestamp.toDate() : undefined;
}
