import { FaultReportStatus, UrgencyLevel } from './enums';

export interface FaultReport {
  id: string;
  userId: string;
  buildingId: string;
  apartmentNumber?: string;
  title: string;
  description: string;
  location: string;
  status: FaultReportStatus;
  urgency: UrgencyLevel;
  imageUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  assignedTo?: string;
}

export interface CreateFaultReportInput {
  buildingId: string;
  apartmentNumber?: string;
  title: string;
  description: string;
  location: string;
  urgency: UrgencyLevel;
  imageUrls?: string[];
}
