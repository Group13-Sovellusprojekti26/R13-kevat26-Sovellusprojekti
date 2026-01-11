import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../../shared/components/Screen';
import { useFaultReportListVM } from '../viewmodels/useFaultReportListVM';
import { FaultReport } from '../../../../data/models/FaultReport';

/**
 * Fault Report List Screen
 * Displays all fault reports created by the current user
 */
export const FaultReportListScreen: React.FC = () => {
  const { t } = useTranslation();
  const { reports, loading, error, refreshing, loadReports, refresh } = useFaultReportListVM();

  useEffect(() => {
    loadReports();
  }, []);

  const renderItem = ({ item }: { item: FaultReport }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>{item.title}</Text>
          <Chip mode="flat" compact>
            {item.status}
          </Chip>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.location}>{item.location}</Text>
          <Chip 
            mode="outlined" 
            compact
            textStyle={styles.urgencyText}
          >
            {item.urgency}
          </Chip>
        </View>
        <Text style={styles.date}>
          {item.createdAt.toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  if (error) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.centerContainer}>
              <Text>{t('faults.noReports')}</Text>
            </View>
          )
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    flex: 1,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  urgencyText: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
});
