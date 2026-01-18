// Firebase status enum
export enum FaultReportStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
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
