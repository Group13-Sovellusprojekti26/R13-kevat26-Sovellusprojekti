import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Pressable } from 'react-native';
import { Text, Surface, useTheme, SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { Screen } from '@/shared/components/Screen';
import { useStatisticsVM, BuildingStats } from '../viewmodels/useStatisticsVM';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_PADDING = 64; // Account for screen padding
const NUM_BARS = 5; // Number of bar categories
const MAX_BAR_WIDTH = 48; // Maximum bar width (for large screens like iPad)

// Calculate bar dimensions based on screen width
const availableWidth = SCREEN_WIDTH - CHART_PADDING - 40; // 40 for y-axis labels and margins
const calculatedBarWidth = Math.floor((availableWidth * 0.65) / NUM_BARS); // Use 65% of space for bars
const calculatedSpacing = Math.floor((availableWidth * 0.35) / (NUM_BARS - 1)); // Use 35% for spacing
const BAR_WIDTH = Math.min(MAX_BAR_WIDTH, Math.max(28, calculatedBarWidth)); // Between 28-48px
const BAR_SPACING = Math.max(10, Math.min(calculatedSpacing, 16)); // Between 10-16px
const LABEL_WIDTH = Math.floor((availableWidth - 20) / NUM_BARS);

// Dynamic bar width calculation for variable number of bars
const calculateDynamicBarWidth = (numBars: number): number => {
  if (numBars <= 0) return BAR_WIDTH;
  const dynamicWidth = Math.floor((availableWidth * 0.65) / numBars);
  return Math.min(MAX_BAR_WIDTH, Math.max(20, dynamicWidth));
};

const calculateDynamicSpacing = (numBars: number): number => {
  if (numBars <= 1) return 0;
  const dynamicSpacing = Math.floor((availableWidth * 0.35) / (numBars - 1));
  return Math.max(8, Math.min(dynamicSpacing, 20));
};

const calculateDynamicLabelWidth = (numBars: number): number => {
  if (numBars <= 0) return LABEL_WIDTH;
  return Math.floor((availableWidth - 20) / numBars);
};

// Colors for building chart - distinct colors for each building
const buildingChartColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

// Colors for apartment chart - different shade palette
const apartmentChartColors = [
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#A855F7', // Violet
  '#F43F5E', // Rose
  '#0EA5E9', // Sky
  '#22C55E', // Green
  '#EAB308', // Yellow
];

/**
 * Statistics screen for Housing Company
 * Shows fault report statistics with a bar chart
 */
export const StatisticsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { faultReportStats, buildingApartmentStats, masterKeyStats, petStats, loading, loadReports } = useStatisticsVM();
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Chart colors - using theme colors for consistency
  const chartColors = {
    open: '#3B82F6',         // Blue - open
    waiting: '#8B5CF6',      // Purple - waiting in queue
    inProgress: '#F59E0B',   // Amber - work in progress
    completed: '#10B981',    // Green - successfully completed
    cancelled: '#EF4444',    // Red - cancelled/failed
  };

  // Prepare bar chart data
  const barData = [
    {
      value: faultReportStats.open,
      label: t('housingCompany.statistics.openReports'),
      frontColor: chartColors.open,
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: theme.colors.onSurface }]}>
          {faultReportStats.open}
        </Text>
      ),
    },
    {
      value: faultReportStats.waiting,
      label: t('housingCompany.statistics.waitingReports'),
      frontColor: chartColors.waiting,
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: theme.colors.onSurface }]}>
          {faultReportStats.waiting}
        </Text>
      ),
    },
    {
      value: faultReportStats.inProgress,
      label: t('housingCompany.statistics.inProgressReports'),
      frontColor: chartColors.inProgress,
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: theme.colors.onSurface }]}>
          {faultReportStats.inProgress}
        </Text>
      ),
    },
    {
      value: faultReportStats.completed,
      label: t('housingCompany.statistics.completedReports'),
      frontColor: chartColors.completed,
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: theme.colors.onSurface }]}>
          {faultReportStats.completed}
        </Text>
      ),
    },
    {
      value: faultReportStats.cancelled,
      label: t('housingCompany.statistics.cancelledReports'),
      frontColor: chartColors.cancelled,
      topLabelComponent: () => (
        <Text style={[styles.barLabel, { color: theme.colors.onSurface }]}>
          {faultReportStats.cancelled}
        </Text>
      ),
    },
  ];

  // Calculate max value for y-axis with some padding
  const maxValue = Math.max(
    faultReportStats.open,
    faultReportStats.waiting,
    faultReportStats.inProgress,
    faultReportStats.completed,
    faultReportStats.cancelled,
    1 // Minimum of 1 to avoid empty chart
  );

  if (loading && faultReportStats.total === 0) {
    return (
      <Screen safeAreaEdges={['right', 'left']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            {t('housingCompany.statistics.loading')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable safeAreaEdges={['right', 'left']}>
      <View style={styles.container}>
        {/* Summary Card */}
        <Surface style={[styles.summaryCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <Text variant="headlineMedium" style={[styles.totalNumber, { color: theme.colors.primary }]}>
            {faultReportStats.total}
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onPrimaryContainer }}>
            {t('housingCompany.statistics.totalReports')}
          </Text>
        </Surface>

        {/* Bar Chart Card */}
        <Surface style={styles.chartCard} elevation={1}>
          <Text variant="titleLarge" style={styles.chartTitle}>
            {t('housingCompany.statistics.faultReportOverview')}
          </Text>
          
          {faultReportStats.total === 0 ? (
            <View style={styles.noDataContainer}>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('housingCompany.statistics.noData')}
              </Text>
            </View>
          ) : (
            <View style={styles.chartContainer}>
              <BarChart
                data={barData}
                width={SCREEN_WIDTH - CHART_PADDING - 40}
                barWidth={BAR_WIDTH}
                spacing={BAR_SPACING}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={1}
                yAxisThickness={0}
                xAxisColor={theme.colors.outlineVariant}
                yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
                noOfSections={4}
                maxValue={Math.ceil(maxValue * 1.2)}
                isAnimated
                animationDuration={500}
                xAxisLabelTextStyle={{
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 9,
                  textAlign: 'center',
                }}
                labelWidth={LABEL_WIDTH}
              />
            </View>
          )}
        </Surface>

        {/* Legend */}
        <Surface style={styles.legendCard} elevation={1}>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: chartColors.open }]} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {t('housingCompany.statistics.openReports')}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: chartColors.waiting }]} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {t('housingCompany.statistics.waitingReports')}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: chartColors.inProgress }]} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {t('housingCompany.statistics.inProgressReports')}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: chartColors.completed }]} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {t('housingCompany.statistics.completedReports')}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: chartColors.cancelled }]} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {t('housingCompany.statistics.cancelledReports')}
              </Text>
            </View>
          </View>
        </Surface>

        {/* Building Statistics Section */}
        {buildingApartmentStats.buildings.length > 0 && (
          <>
            {/* Building Bar Chart */}
            <Surface style={styles.chartCard} elevation={1}>
              <Text variant="titleLarge" style={styles.chartTitle}>
                {t('housingCompany.statistics.buildingOverview')}
              </Text>
              <Text variant="bodyMedium" style={[styles.chartSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {t('housingCompany.statistics.buildingOverviewSubtitle')}
              </Text>
              
              <View style={styles.chartContainer}>
                <BarChart
                  data={buildingApartmentStats.buildings.map((building, index) => ({
                    value: building.count,
                    label: t('housingCompany.statistics.buildingLabel', { number: building.buildingId }),
                    frontColor: buildingChartColors[index % buildingChartColors.length],
                    topLabelComponent: () => (
                      <Text style={[styles.barLabel, { color: theme.colors.onSurface }]}>
                        {building.count}
                      </Text>
                    ),
                    onPress: () => setSelectedBuilding(
                      selectedBuilding === building.buildingId ? null : building.buildingId
                    ),
                  }))}
                  width={SCREEN_WIDTH - CHART_PADDING - 40}
                  barWidth={calculateDynamicBarWidth(buildingApartmentStats.buildings.length)}
                  spacing={calculateDynamicSpacing(buildingApartmentStats.buildings.length)}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={1}
                  yAxisThickness={0}
                  xAxisColor={theme.colors.outlineVariant}
                  yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
                  noOfSections={4}
                  maxValue={Math.ceil(Math.max(...buildingApartmentStats.buildings.map(b => b.count), 1) * 1.2)}
                  isAnimated
                  animationDuration={500}
                  xAxisLabelTextStyle={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 10,
                    textAlign: 'center',
                  }}
                  labelWidth={calculateDynamicLabelWidth(buildingApartmentStats.buildings.length)}
                />
              </View>
              
              {/* Instruction to tap */}
              <Text variant="bodySmall" style={[styles.tapInstruction, { color: theme.colors.onSurfaceVariant }]}>
                {t('housingCompany.statistics.tapBuildingInstruction')}
              </Text>
            </Surface>

            {/* Building Legend */}
            <Surface style={styles.legendCard} elevation={1}>
              <View style={styles.legendContainer}>
                {buildingApartmentStats.buildings.map((building, index) => (
                  <Pressable
                    key={building.buildingId}
                    style={[
                      styles.legendItem,
                      selectedBuilding === building.buildingId && styles.legendItemSelected,
                    ]}
                    onPress={() => setSelectedBuilding(
                      selectedBuilding === building.buildingId ? null : building.buildingId
                    )}
                  >
                    <View style={[styles.legendColor, { backgroundColor: buildingChartColors[index % buildingChartColors.length] }]} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      {t('housingCompany.statistics.buildingLabel', { number: building.buildingId })} ({building.count})
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Surface>

            {/* Apartment Statistics for Selected Building */}
            {selectedBuilding && (
              <Surface style={styles.chartCard} elevation={1}>
                <Text variant="titleLarge" style={styles.chartTitle}>
                  {t('housingCompany.statistics.apartmentOverview', { building: selectedBuilding })}
                </Text>
                <Text variant="bodyMedium" style={[styles.chartSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {t('housingCompany.statistics.apartmentOverviewSubtitle')}
                </Text>
                
                {(() => {
                  const building = buildingApartmentStats.buildings.find(b => b.buildingId === selectedBuilding);
                  if (!building || building.apartments.length === 0) {
                    return (
                      <View style={styles.noDataContainer}>
                        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                          {t('housingCompany.statistics.noApartmentData')}
                        </Text>
                      </View>
                    );
                  }
                  
                  return (
                    <>
                      <View style={styles.chartContainer}>
                        <BarChart
                          data={building.apartments.map((apt, index) => ({
                            value: apt.count,
                            label: t('housingCompany.statistics.apartmentLabel', { number: apt.apartmentNumber }),
                            frontColor: apartmentChartColors[index % apartmentChartColors.length],
                            topLabelComponent: () => (
                              <Text style={[styles.barLabel, { color: theme.colors.onSurface }]}>
                                {apt.count}
                              </Text>
                            ),
                          }))}
                          width={SCREEN_WIDTH - CHART_PADDING - 40}
                          barWidth={calculateDynamicBarWidth(building.apartments.length)}
                          spacing={calculateDynamicSpacing(building.apartments.length)}
                          roundedTop
                          roundedBottom
                          hideRules
                          xAxisThickness={1}
                          yAxisThickness={0}
                          xAxisColor={theme.colors.outlineVariant}
                          yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
                          noOfSections={4}
                          maxValue={Math.ceil(Math.max(...building.apartments.map(a => a.count), 1) * 1.2)}
                          isAnimated
                          animationDuration={500}
                          xAxisLabelTextStyle={{
                            color: theme.colors.onSurfaceVariant,
                            fontSize: 10,
                            textAlign: 'center',
                          }}
                          labelWidth={calculateDynamicLabelWidth(building.apartments.length)}
                        />
                      </View>

                      {/* Apartment Legend */}
                      <View style={styles.apartmentLegendContainer}>
                        {building.apartments.map((apt, index) => (
                          <View key={apt.apartmentNumber} style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: apartmentChartColors[index % apartmentChartColors.length] }]} />
                            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                              {t('housingCompany.statistics.apartmentLabel', { number: apt.apartmentNumber })} ({apt.count})
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  );
                })()}
              </Surface>
            )}
          </>
        )}

        {/* Master Key Access Pie Chart */}
        {masterKeyStats.total > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleLarge" style={styles.chartTitle}>
              {t('housingCompany.statistics.masterKeyOverview')}
            </Text>
            <Text variant="bodyMedium" style={[styles.chartSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('housingCompany.statistics.masterKeyOverviewSubtitle')}
            </Text>
            
            <View style={styles.pieChartContainer}>
              <PieChart
                data={[
                  {
                    value: masterKeyStats.allowed,
                    color: '#10B981',
                    text: `${masterKeyStats.allowedPercentage}%`,
                    textColor: '#fff',
                    textSize: 14,
                  },
                  {
                    value: masterKeyStats.notAllowed,
                    color: '#EF4444',
                    text: `${masterKeyStats.notAllowedPercentage}%`,
                    textColor: '#fff',
                    textSize: 14,
                  },
                ]}
                radius={80}
                innerRadius={40}
                showText
                textBackgroundRadius={20}
                focusOnPress
                showValuesAsLabels
              />
            </View>

            {/* Pie Chart Legend */}
            <View style={styles.pieLegendContainer}>
              <View style={styles.pieLegendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {t('housingCompany.statistics.masterKeyAllowed')} ({masterKeyStats.allowed})
                </Text>
              </View>
              <View style={styles.pieLegendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {t('housingCompany.statistics.masterKeyNotAllowed')} ({masterKeyStats.notAllowed})
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Pet Statistics Pie Chart */}
        {petStats.total > 0 && (
          <Surface style={styles.chartCard} elevation={1}>
            <Text variant="titleLarge" style={styles.chartTitle}>
              {t('housingCompany.statistics.petOverview')}
            </Text>
            <Text variant="bodyMedium" style={[styles.chartSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('housingCompany.statistics.petOverviewSubtitle')}
            </Text>
            
            <View style={styles.pieChartContainer}>
              <PieChart
                data={[
                  {
                    value: petStats.hasPets,
                    color: '#3B82F6',
                    text: `${petStats.hasPetsPercentage}%`,
                    textColor: '#fff',
                    textSize: 14,
                  },
                  {
                    value: petStats.noPets,
                    color: '#F97316',
                    text: `${petStats.noPetsPercentage}%`,
                    textColor: '#fff',
                    textSize: 14,
                  },
                ]}
                radius={80}
                innerRadius={40}
                showText
                textBackgroundRadius={20}
                focusOnPress
                showValuesAsLabels
              />
            </View>

            {/* Pie Chart Legend */}
            <View style={styles.pieLegendContainer}>
              <View style={styles.pieLegendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {t('housingCompany.statistics.hasPets')} ({petStats.hasPets})
                </Text>
              </View>
              <View style={styles.pieLegendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#F97316' }]} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  {t('housingCompany.statistics.noPets')} ({petStats.noPets})
                </Text>
              </View>
            </View>
          </Surface>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  totalNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
  },
  chartTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  chartSubtitle: {
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  legendCard: {
    padding: 16,
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: '40%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  legendItemSelected: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  tapInstruction: {
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  apartmentLegendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  pieLegendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 8,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
