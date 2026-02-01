import React from 'react';
import { FaultReportListScreen as UnifiedFaultReportListScreen } from '@/shared/components/FaultReportListScreen';

/**
 * Fault Report List Screen for residents
 * Shows fault reports created by resident with edit capability
 */
export const FaultReportListScreen: React.FC = () => (
  <UnifiedFaultReportListScreen detailScreenName="FaultReportDetails" isResident={true} />
);
