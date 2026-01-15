import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../../shared/components/Screen';
import { useFaultReportListVM } from '../viewmodels/useFaultReportListVM';
import { FaultReport } from '../../../../data/models/FaultReport';
import { Image, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SkeletonCard } from '../../../../shared/components/SkeletonCard';
import { EmptyState } from '../../../../shared/components/EmptyState';


/**
 * Fault Report List Screen
 * Displays all fault reports created by the current user
 */
export const FaultReportListScreen: React.FC = () => {
  const { t } = useTranslation();
  const { reports, loading, error, refreshing, loadReports, refresh } = useFaultReportListVM();
  const navigation = useNavigation<any>();


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
        {(item.imageUrls ?? []).length > 0 && (
  <ScrollView horizontal style={{ marginBottom: 8 }}>
    {(item.imageUrls ?? []).map((uri, index) => (
      <Pressable
        key={index}
        onPress={() =>
          navigation.navigate('ImagePreview', {
            images: item.imageUrls ?? [],
            index,
          })
        }
        style={{ marginRight: 8 }}
      >
        <Image
          source={{ uri }}
          style={{
            width: 60,
            height: 60,
            borderRadius: 6,
          }}
        />
      </Pressable>
    ))}
  </ScrollView>
)}

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
if (loading) {
  return (
    <Screen>
      <View style={{ padding: 16 }}>
        {[1, 2, 3].map(i => (
          <SkeletonCard key={i} />
        ))}
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
    <EmptyState
      onCreate={() => navigation.navigate('CreateFaultReport')}
    />
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
