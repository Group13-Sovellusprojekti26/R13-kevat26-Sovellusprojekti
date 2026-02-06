import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'react-native-paper';
import { TFButton } from '@/shared/components/TFButton';
import { haptic } from '@/shared/utils/haptics';
import { FaultReportStatus } from '@/data/models/enums';
import { logError, parseFirebaseError } from '@/shared/utils/errors';
import { StatusActionDefinition } from '@/shared/utils/faultReportStatusActions';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type StatusActionBarProps = {
  actions: StatusActionDefinition[];
  onAction: (status: FaultReportStatus) => Promise<void>;
  onStatusChanged?: () => void;
};

const getErrorMessage = (
  error: unknown,
  t: (key: string) => string
): string => {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? '';
  if (code.includes('permission-denied')) {
    return t('faults.statusError.permission');
  }
  if (code.includes('failed-precondition')) {
    return t('faults.statusError.transition');
  }
  const parsed = parseFirebaseError(error);
  return parsed.includes('.') ? t(parsed) : t('faults.statusError.generic');
};

export const StatusActionBar: React.FC<StatusActionBarProps> = ({
  actions,
  onAction,
  onStatusChanged,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loadingStatus, setLoadingStatus] = useState<FaultReportStatus | null>(null);
  const [disabledActions, setDisabledActions] = useState<Set<FaultReportStatus>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const resolvedActions = useMemo(() => actions, [actions]);

  // Filter out disabled actions
  const visibleActions = useMemo(
    () => resolvedActions.filter(action => !disabledActions.has(action.status)),
    [resolvedActions, disabledActions]
  );

  // Separate primary action (first one) from secondary actions
  const primaryAction = visibleActions[0];
  const secondaryActions = visibleActions.slice(1);

  if (visibleActions.length === 0) {
    return null;
  }

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const executeAction = async (action: StatusActionDefinition) => {
    if (loadingStatus) {
      return;
    }

    setLoadingStatus(action.status);
    try {
      await onAction(action.status);
      haptic.light();
      onStatusChanged?.();
    } catch (error: unknown) {
      logError(error, 'Status Action');
      Alert.alert(t('common.error'), getErrorMessage(error, t));
      const err = error as { code?: string };
      const code = err?.code ?? '';
      if (code.includes('permission-denied') || code.includes('failed-precondition')) {
        setDisabledActions(prev => new Set(prev).add(action.status));
      }
    } finally {
      setLoadingStatus(null);
    }
  };

  const handleAction = (action: StatusActionDefinition) => {
    if (action.confirmBodyKey) {
      Alert.alert(
        t(action.confirmTitleKey ?? 'faults.statusConfirm.title'),
        t(action.confirmBodyKey),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => {
              void executeAction(action);
            },
          },
        ]
      );
      return;
    }

    void executeAction(action);
  };

  const renderActionButton = (action: StatusActionDefinition) => (
    <TFButton
      key={action.status}
      title={t(action.labelKey)}
      onPress={() => handleAction(action)}
      loading={loadingStatus === action.status}
      disabled={loadingStatus !== null}
      fullWidth
      mode={action.mode}
      textColor={
        action.destructive
          ? theme.colors.error
          : action.tone === 'warning'
            ? theme.colors.secondary
            : undefined
      }
      style={styles.button}
    />
  );

  // If only 1-2 actions, show them directly without collapse
  if (visibleActions.length <= 2) {
    return (
      <View style={styles.container}>
        {visibleActions.map(renderActionButton)}
      </View>
    );
  }

  // For 3+ actions, show primary action + expandable section for rest
  return (
    <View style={styles.container}>
      {/* Primary action always visible */}
      {primaryAction && renderActionButton(primaryAction)}
      
      {/* Toggle button for secondary actions */}
      <TFButton
        title={isExpanded ? t('faults.statusActions.hideMore') : t('faults.statusActions.showMore')}
        onPress={toggleExpanded}
        mode="text"
        icon={isExpanded ? 'chevron-up' : 'chevron-down'}
        style={styles.toggleButton}
      />
      
      {/* Secondary actions - collapsible */}
      {isExpanded && (
        <View style={styles.secondaryActions}>
          {secondaryActions.map(renderActionButton)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  button: {
    borderRadius: 16,
  },
  toggleButton: {
    alignSelf: 'center',
  },
  secondaryActions: {
    gap: 8,
  },
});
