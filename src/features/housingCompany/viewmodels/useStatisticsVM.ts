import { create } from 'zustand';
import { FaultReport } from '@/data/models/FaultReport';
import { FaultReportStatus } from '@/data/models/enums';
import { useCompanyFaultReportsVM } from '@/shared/viewmodels/useCompanyFaultReportsVM';

/**
 * Fault report statistics data structure
 */
export interface FaultReportStats {
  total: number;
  open: number;
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

/**
 * Statistics for a single building
 */
export interface BuildingStats {
  buildingId: string;
  count: number;
  apartments: ApartmentStats[];
}

/**
 * Statistics for a single apartment
 */
export interface ApartmentStats {
  apartmentNumber: string;
  count: number;
}

/**
 * Building and apartment statistics data structure
 */
export interface BuildingApartmentStats {
  buildings: BuildingStats[];
  topBuilding: { buildingId: string; count: number } | null;
  topApartment: { buildingId: string; apartmentNumber: string; count: number } | null;
}

/**
 * Master key access statistics data structure
 */
export interface MasterKeyStats {
  allowed: number;
  notAllowed: number;
  total: number;
  allowedPercentage: number;
  notAllowedPercentage: number;
}

/**
 * Pet statistics data structure
 */
export interface PetStats {
  hasPets: number;
  noPets: number;
  total: number;
  hasPetsPercentage: number;
  noPetsPercentage: number;
}

interface StatisticsState {
  loading: boolean;
  error: string | null;
}

interface StatisticsActions {
  clearError: () => void;
}

type StatisticsVM = StatisticsState & StatisticsActions;

/**
 * Helper function to calculate fault report statistics from reports array
 */
export const calculateFaultReportStats = (reports: FaultReport[]): FaultReportStats => {
  const total = reports.length;
  
  // Open statuses: created, open
  const open = reports.filter(
    r => r.status === FaultReportStatus.CREATED || r.status === FaultReportStatus.OPEN
  ).length;
  
  // Waiting status
  const waiting = reports.filter(
    r => r.status === FaultReportStatus.WAITING
  ).length;
  
  // In progress status (only in_progress, not waiting)
  const inProgress = reports.filter(
    r => r.status === FaultReportStatus.IN_PROGRESS
  ).length;
  
  // Completed statuses: completed, resolved, closed
  const completed = reports.filter(
    r => r.status === FaultReportStatus.COMPLETED || 
         r.status === FaultReportStatus.RESOLVED || 
         r.status === FaultReportStatus.CLOSED
  ).length;
  
  // Cancelled/failed statuses: cancelled, incomplete, not_possible
  const cancelled = reports.filter(
    r => r.status === FaultReportStatus.CANCELLED || 
         r.status === FaultReportStatus.INCOMPLETE || 
         r.status === FaultReportStatus.NOT_POSSIBLE
  ).length;
  
  return {
    total,
    open,
    waiting,
    inProgress,
    completed,
    cancelled,
  };
};

/**
 * Helper function to calculate building and apartment statistics from reports array
 */
export const calculateBuildingApartmentStats = (reports: FaultReport[]): BuildingApartmentStats => {
  // Group reports by building and apartment
  const buildingMap = new Map<string, Map<string, number>>();
  
  for (const report of reports) {
    const buildingId = report.createdByBuilding || 'unknown';
    const apartmentNumber = report.createdByApartment || 'unknown';
    
    if (!buildingMap.has(buildingId)) {
      buildingMap.set(buildingId, new Map<string, number>());
    }
    
    const apartmentMap = buildingMap.get(buildingId)!;
    apartmentMap.set(apartmentNumber, (apartmentMap.get(apartmentNumber) || 0) + 1);
  }
  
  // Convert to BuildingStats array
  const buildings: BuildingStats[] = [];
  let topBuilding: { buildingId: string; count: number } | null = null;
  let topApartment: { buildingId: string; apartmentNumber: string; count: number } | null = null;
  
  for (const [buildingId, apartmentMap] of buildingMap) {
    // Skip unknown buildings
    if (buildingId === 'unknown') continue;
    
    const apartments: ApartmentStats[] = [];
    let buildingTotal = 0;
    
    for (const [apartmentNumber, count] of apartmentMap) {
      // Skip unknown apartments
      if (apartmentNumber === 'unknown') continue;
      
      apartments.push({ apartmentNumber, count });
      buildingTotal += count;
      
      // Track top apartment
      if (!topApartment || count > topApartment.count) {
        topApartment = { buildingId, apartmentNumber, count };
      }
    }
    
    // Sort apartments by apartment number (numeric order)
    apartments.sort((a, b) => {
      const numA = parseInt(a.apartmentNumber, 10);
      const numB = parseInt(b.apartmentNumber, 10);
      // If both are valid numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Otherwise sort alphabetically
      return a.apartmentNumber.localeCompare(b.apartmentNumber);
    });
    
    buildings.push({ buildingId, count: buildingTotal, apartments });
    
    // Track top building
    if (!topBuilding || buildingTotal > topBuilding.count) {
      topBuilding = { buildingId, count: buildingTotal };
    }
  }
  
  // Sort buildings by building number (numeric order)
  buildings.sort((a, b) => {
    const numA = parseInt(a.buildingId, 10);
    const numB = parseInt(b.buildingId, 10);
    // If both are valid numbers, sort numerically
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    // Otherwise sort alphabetically
    return a.buildingId.localeCompare(b.buildingId);
  });
  
  return {
    buildings,
    topBuilding,
    topApartment,
  };
};

/**
 * Helper function to calculate master key access statistics from reports array
 */
export const calculateMasterKeyStats = (reports: FaultReport[]): MasterKeyStats => {
  const total = reports.length;
  const allowed = reports.filter(r => r.allowMasterKeyAccess === true).length;
  const notAllowed = total - allowed;
  
  return {
    allowed,
    notAllowed,
    total,
    allowedPercentage: total > 0 ? Math.round((allowed / total) * 100) : 0,
    notAllowedPercentage: total > 0 ? Math.round((notAllowed / total) * 100) : 0,
  };
};

/**
 * Helper function to calculate pet statistics from reports array
 */
export const calculatePetStats = (reports: FaultReport[]): PetStats => {
  const total = reports.length;
  const hasPets = reports.filter(r => r.hasPets === true).length;
  const noPets = total - hasPets;
  
  return {
    hasPets,
    noPets,
    total,
    hasPetsPercentage: total > 0 ? Math.round((hasPets / total) * 100) : 0,
    noPetsPercentage: total > 0 ? Math.round((noPets / total) * 100) : 0,
  };
};

/**
 * Statistics ViewModel for Housing Company
 * 
 * This ViewModel provides computed statistics from the shared company fault reports store.
 * It follows MVVM pattern and derives data from the existing reports store.
 */
const useStatisticsStore = create<StatisticsVM>((set) => ({
  loading: false,
  error: null,

  clearError: () => set({ error: null }),
}));

/**
 * Custom hook that combines statistics state with computed fault report stats
 */
export const useStatisticsVM = () => {
  const storeState = useStatisticsStore();
  const reports = useCompanyFaultReportsVM(state => state.reports);
  const reportsLoading = useCompanyFaultReportsVM(state => state.loading);
  const loadReports = useCompanyFaultReportsVM(state => state.loadReports);
  
  const faultReportStats = calculateFaultReportStats(reports);
  const buildingApartmentStats = calculateBuildingApartmentStats(reports);
  const masterKeyStats = calculateMasterKeyStats(reports);
  const petStats = calculatePetStats(reports);
  
  return {
    ...storeState,
    loading: reportsLoading,
    faultReportStats,
    buildingApartmentStats,
    masterKeyStats,
    petStats,
    loadReports,
  };
};
