import React, { useState } from 'react';
import { View, Text as RNText } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

/**
 * Props for FormDateRangeSelector component
 */
interface FormDateRangeSelectorProps {
  /** Label for the date range section */
  label: string;
  /** Start date value (optional) */
  startDate?: Date;
  /** Start time in HH:mm format (optional) */
  startTime?: string;
  /** End date value (required) */
  endDate: Date;
  /** End time in HH:mm format (optional) */
  endTime?: string;
  /** Callback when start date changes */
  onStartDateChange: (date: Date) => void;
  /** Callback when start time changes */
  onStartTimeChange: (time: string) => void;
  /** Callback when end date changes */
  onEndDateChange: (date: Date) => void;
  /** Callback when end time changes */
  onEndTimeChange: (time: string) => void;
  /** Locale code for date formatting */
  locale?: string;
  /** Whether to show start date picker (optional, controlled externally) */
  showStartDatePicker?: boolean;
  /** Callback to toggle start date picker visibility */
  onShowStartDatePickerChange?: (visible: boolean) => void;
  /** Whether to show start time picker (optional, controlled externally) */
  showStartTimePicker?: boolean;
  /** Callback to toggle start time picker visibility */
  onShowStartTimePickerChange?: (visible: boolean) => void;
  /** Whether to show end date picker (optional, controlled externally) */
  showEndDatePicker?: boolean;
  /** Callback to toggle end date picker visibility */
  onShowEndDatePickerChange?: (visible: boolean) => void;
  /** Whether to show end time picker (optional, controlled externally) */
  showEndTimePicker?: boolean;
  /** Callback to toggle end time picker visibility */
  onShowEndTimePickerChange?: (visible: boolean) => void;
  /** End date error message (optional) */
  endDateError?: string;
  /** Whether start fields are shown */
  showStartFields?: boolean;
  /** Whether end date is required (shows asterisk) */
  endDateRequired?: boolean;
}

/**
 * Reusable date range selector component with time support.
 * Abstracts date/time picker logic for forms (announcements, reports, etc).
 * Manages DateTimePicker visibility, formatting, and user interactions.
 * 
 * Features:
 * - Date selection with visual feedback
 * - Optional time selection (HH:mm format)
 * - Locale-aware date formatting
 * - Error message display for end date
 * - Flexible visibility control (internal or external state)
 * - Support for optional start date/time
 * - Accessible button labels and error messages
 * 
 * @component FormDateRangeSelector
 * @param {FormDateRangeSelectorProps} props - Component props
 * @returns {JSX.Element} Date range selector with pickers
 * 
 * @example
 * const [startDate, setStartDate] = useState<Date>();
 * const [startTime, setStartTime] = useState('');
 * const [endDate, setEndDate] = useState(new Date());
 * const [endTime, setEndTime] = useState('');
 * 
 * <FormDateRangeSelector
 *   label="Event Duration"
 *   startDate={startDate}
 *   startTime={startTime}
 *   endDate={endDate}
 *   endTime={endTime}
 *   onStartDateChange={setStartDate}
 *   onStartTimeChange={setStartTime}
 *   onEndDateChange={setEndDate}
 *   onEndTimeChange={setEndTime}
 *   locale="fi"
 *   showStartFields
 * />
 */
export const FormDateRangeSelector: React.FC<FormDateRangeSelectorProps> = ({
  label,
  startDate,
  startTime,
  endDate,
  endTime,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  locale = 'en',
  endDateError,
  showStartFields = true,
  endDateRequired = true,
  showStartDatePicker: externalShowStartDatePicker,
  onShowStartDatePickerChange: externalOnShowStartDatePickerChange,
  showStartTimePicker: externalShowStartTimePicker,
  onShowStartTimePickerChange: externalOnShowStartTimePickerChange,
  showEndDatePicker: externalShowEndDatePicker,
  onShowEndDatePickerChange: externalOnShowEndDatePickerChange,
  showEndTimePicker: externalShowEndTimePicker,
  onShowEndTimePickerChange: externalOnShowEndTimePickerChange,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  // Internal state management for visibility (fallback if not controlled externally)
  const [internalShowStartDatePicker, setInternalShowStartDatePicker] = useState(false);
  const [internalShowStartTimePicker, setInternalShowStartTimePicker] = useState(false);
  const [internalShowEndDatePicker, setInternalShowEndDatePicker] = useState(false);
  const [internalShowEndTimePicker, setInternalShowEndTimePicker] = useState(false);

  // Use external state if provided, otherwise use internal
  const showStartDatePicker = externalShowStartDatePicker ?? internalShowStartDatePicker;
  const setShowStartDatePicker = externalOnShowStartDatePickerChange ?? setInternalShowStartDatePicker;

  const showStartTimePicker = externalShowStartTimePicker ?? internalShowStartTimePicker;
  const setShowStartTimePicker = externalOnShowStartTimePickerChange ?? setInternalShowStartTimePicker;

  const showEndDatePicker = externalShowEndDatePicker ?? internalShowEndDatePicker;
  const setShowEndDatePicker = externalOnShowEndDatePickerChange ?? setInternalShowEndDatePicker;

  const showEndTimePicker = externalShowEndTimePicker ?? internalShowEndTimePicker;
  const setShowEndTimePicker = externalOnShowEndTimePickerChange ?? setInternalShowEndTimePicker;

  // Handle date/time changes
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      onStartDateChange(selectedDate);
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      onStartTimeChange(`${hours}:${minutes}`);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      onEndDateChange(selectedDate);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      onEndTimeChange(`${hours}:${minutes}`);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Section Label */}
      {label && (
        <Text variant="labelLarge" style={{ fontWeight: '600', marginBottom: 8 }}>
          {label}
        </Text>
      )}

      {/* Start Date */}
      {showStartFields && (
        <>
          <View>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>
              {t('common.startDate')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => {
                setShowStartDatePicker(true);
                if (!startDate) {
                  onStartDateChange(new Date());
                }
              }}
              style={{ justifyContent: 'center' }}
            >
              {startDate ? startDate.toLocaleDateString() : t('common.selectDate')}
            </Button>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
                locale={locale as any}
              />
            )}
          </View>

          {/* Start Time */}
          <View>
            <Text variant="labelMedium" style={{ marginBottom: 4 }}>
              {t('common.startTime')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowStartTimePicker(true)}
              style={{ justifyContent: 'center' }}
            >
              {startTime || t('common.selectTime')}
            </Button>
            {showStartTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${startTime || '00:00'}`)}
                mode="time"
                display="default"
                onChange={handleStartTimeChange}
                locale={locale as any}
              />
            )}
          </View>
        </>
      )}

      {/* End Date */}
      <View>
        <Text variant="labelMedium" style={{ marginBottom: 4 }}>
          {t('common.endDate')} {endDateRequired && '*'}
        </Text>
        <Button
          mode="outlined"
          onPress={() => setShowEndDatePicker(true)}
          style={{ justifyContent: 'center' }}
        >
          {endDate.toLocaleDateString()}
        </Button>
        {endDateError && (
          <Text style={{ color: theme.colors.error, fontSize: 12, marginTop: 4 }}>
            {endDateError}
          </Text>
        )}
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
            locale={locale as any}
          />
        )}
      </View>

      {/* End Time */}
      <View>
        <Text variant="labelMedium" style={{ marginBottom: 4 }}>
          {t('common.endTime')}
        </Text>
        <Button
          mode="outlined"
          onPress={() => setShowEndTimePicker(true)}
          style={{ justifyContent: 'center' }}
        >
          {endTime || t('common.selectTime')}
        </Button>
        {showEndTimePicker && (
          <DateTimePicker
            value={new Date(`2000-01-01T${endTime || '00:00'}`)}
            mode="time"
            display="default"
            onChange={handleEndTimeChange}
            locale={locale as any}
          />
        )}
      </View>
    </View>
  );
};
