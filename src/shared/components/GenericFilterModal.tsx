import React from 'react';
import { View, Modal, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, useTheme, RadioButton, Checkbox } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { TFButton } from './TFButton';
import { spacing, borderRadius } from '@/app/theme/theme';

export interface FilterOption {
  label: string;
  value: string;
}

/**
 * Represents a single filter section (e.g., Status, Type, Priority, etc.)
 * Each section is independent and can have multiple options
 * 
 * @property {string} title - Section header text (localized)
 * @property {'radio' | 'checkbox'} type - Single-select (radio) or multi-select (checkbox)
 * @property {FilterOption[]} options - Available filter options in this section
 * @property {string | string[]} selectedValues - Current selection(s)
 * @property {Function} onchange - Callback when selection changes
 * 
 * @example
 * // Single-select section (status)
 * {
 *   title: t('status'),
 *   type: 'radio',
 *   options: [{ label: 'Active', value: 'active' }, { label: 'Expired', value: 'expired' }],
 *   selectedValues: 'active',
 *   onchange: (value) => setStatus(value as string)
 * }
 * 
 * @example
 * // Multi-select section (types)
 * {
 *   title: t('types'),
 *   type: 'checkbox',
 *   options: [{ label: 'Type A', value: 'a' }, { label: 'Type B', value: 'b' }],
 *   selectedValues: ['a', 'b'],
 *   onchange: (values) => setTypes(values as string[])
 * }
 */
export interface FilterSection {
  title: string;
  type: 'radio' | 'checkbox';
  options: FilterOption[];
  selectedValues: string | string[];
  onchange: (value: string | string[]) => void;
}

interface GenericFilterModalProps {
  visible: boolean;
  sections: FilterSection[];
  onClose: () => void;
}

/**
 * Generic reusable filter modal component
 * 
 * **Modularity**: Pass any number of filter sections via the `sections` prop.
 * The modal will render them in order, supporting both single-select (radio) 
 * and multi-select (checkbox) filters in the same modal.
 * 
 * **Consistency**: Automatically applies theme colors, spacing, and styling 
 * from the app's design system.
 * 
 * **Flexibility**: Each section operates independently - filtering by one 
 * section doesn't affect others. Different screens can use different 
 * combinations of filter sections.
 * 
 * Used by:
 * - AnnouncementsListScreen: Status (radio) + Type (checkbox)
 * - FaultReportListScreen: Status (radio only)
 * - Can be extended for: Priority, Category, Date Range, Tags, etc.
 * 
 * @component GenericFilterModal
 * @param {GenericFilterModalProps} props
 * @returns {JSX.Element} Modal containing filter sections
 * 
 * @example
 * // Usage with multiple sections
 * <GenericFilterModal
 *   visible={filterVisible}
 *   sections={[
 *     {
 *       title: 'Status',
 *       type: 'radio',
 *       options: [{ label: 'Active', value: 'active' }, ...],
 *       selectedValues: status,
 *       onchange: setStatus,
 *     },
 *     {
 *       title: 'Type',
 *       type: 'checkbox',
 *       options: [{ label: 'Type A', value: 'a' }, ...],
 *       selectedValues: types,
 *       onchange: setTypes,
 *     }
 *   ]}
 *   onClose={() => setFilterVisible(false)}
 * />
 * 
 * @example
 * // Simple usage with single section
 * <GenericFilterModal
 *   visible={filterVisible}
 *   sections={[
 *     {
 *       title: 'Priority',
 *       type: 'radio',
 *       options: [{ label: 'High', value: 'high' }, ...],
 *       selectedValues: priority,
 *       onchange: setPriority,
 *     }
 *   ]}
 *   onClose={() => setFilterVisible(false)}
 * />
 */
export const GenericFilterModal: React.FC<GenericFilterModalProps> = ({
  visible,
  sections,
  onClose,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Surface
          style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
          elevation={4}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
            style={styles.scrollView}
          >
            {sections.map((section, index) => (
              <View key={`${section.title}-${index}`}>
                <Text variant="labelLarge" style={styles.sectionTitle}>
                  {section.title}
                </Text>

                {section.type === 'radio' && (
                  <RadioButton.Group
                    onValueChange={section.onchange as (value: string) => void}
                    value={section.selectedValues as string}
                  >
                    {section.options.map((option) => (
                      <RadioButton.Item
                        key={option.value}
                        label={option.label}
                        value={option.value}
                      />
                    ))}
                  </RadioButton.Group>
                )}

                {section.type === 'checkbox' && (
                  <View>
                    {section.options.map((option) => (
                      <View key={option.value} style={styles.checkboxItem}>
                        <Checkbox
                          status={
                            (section.selectedValues as string[]).includes(option.value)
                              ? 'checked'
                              : 'unchecked'
                          }
                          onPress={() => {
                            const current = section.selectedValues as string[];
                            if (current.includes(option.value)) {
                              section.onchange(current.filter(v => v !== option.value));
                            } else {
                              section.onchange([...current, option.value]);
                            }
                          }}
                        />
                        <Text
                          variant="bodyMedium"
                          style={styles.checkboxLabel}
                          onPress={() => {
                            const current = section.selectedValues as string[];
                            if (current.includes(option.value)) {
                              section.onchange(current.filter(v => v !== option.value));
                            } else {
                              section.onchange([...current, option.value]);
                            }
                          }}
                        >
                          {option.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TFButton
              title={t('common.done')}
              mode="contained"
              onPress={onClose}
              fullWidth
            />
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    height: '80%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalScrollContent: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    flexGrow: 0,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
});
