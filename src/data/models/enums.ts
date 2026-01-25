// Firebase status enum
export enum FaultReportStatus {
  CREATED = 'created',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  INCOMPLETE = 'incomplete',
  NOT_POSSIBLE = 'not_possible',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// Urgency levels
export enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// User roles
export enum UserRole {
  RESIDENT = 'resident',
  PROPERTY_MANAGER = 'property_manager',
  MAINTENANCE = 'maintenance',
  SERVICE_COMPANY = 'service_company',
  HOUSING_COMPANY = 'housing_company',
  ADMIN = 'admin',
}

// Announcement types
export enum AnnouncementType {
  GENERAL = 'general',
  MAINTENANCE = 'maintenance',
  EMERGENCY = 'emergency',
  EVENT = 'event',
}
