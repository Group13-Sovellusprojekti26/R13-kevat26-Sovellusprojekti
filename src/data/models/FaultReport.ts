import { FaultReportStatus, UrgencyLevel } from './enums';

export interface FaultReport {
  id: string;
  userId: string;
  createdByUserId: string;
  createdByName?: string; // Display name of the user who created the report
  createdByApartment?: string; // Apartment number of the user who created the report
  createdByBuilding?: string; // Building identifier/number of the user
  apartmentId?: string;
  buildingId: string;
  housingCompanyId: string;
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
  allowMasterKeyAccess?: boolean;
  hasPets?: boolean;
}

export interface CreateFaultReportInput {
  title: string;
  description: string;
  location: string;
  urgency: UrgencyLevel;
  apartmentNumber?: string;
  imageUris?: string[];
  allowMasterKeyAccess?: boolean;
  hasPets?: boolean;
}

