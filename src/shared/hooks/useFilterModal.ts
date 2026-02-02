import { useMemo, useState } from 'react';
import type { FilterSection, FilterOption } from '../components/GenericFilterModal';

/**
 * Helper function to create a radio (single-select) filter section
 * Makes it much simpler to define filter sections
 * 
 * @example
 * createRadioFilter(
 *   t('status'),
 *   status,
 *   setStatus,
 *   [
 *     { label: 'Active', value: 'active' },
 *     { label: 'Inactive', value: 'inactive' }
 *   ]
 * )
 */
export const createRadioFilter = (
  title: string,
  selectedValue: string,
  onChange: (value: string) => void,
  options: FilterOption[]
): FilterSection => ({
  title,
  type: 'radio',
  options,
  selectedValues: selectedValue,
  onchange: (value: string | string[]) => onChange(value as string),
});

/**
 * Helper function to create a checkbox (multi-select) filter section
 * Makes it much simpler to define filter sections
 * 
 * @example
 * createCheckboxFilter(
 *   t('types'),
 *   selectedTypes,
 *   setSelectedTypes,
 *   [
 *     { label: 'Type A', value: 'a' },
 *     { label: 'Type B', value: 'b' }
 *   ]
 * )
 */
export const createCheckboxFilter = (
  title: string,
  selectedValues: string[],
  onChange: (values: string[]) => void,
  options: FilterOption[]
): FilterSection => ({
  title,
  type: 'checkbox',
  options,
  selectedValues,
  onchange: (values: string | string[]) => onChange(values as string[]),
});

/**
 * Custom hook for managing filter modal state and sections
 * Simplifies modal visibility and filter section management
 * 
 * @param {FilterSection[]} initialSections - Initial filter sections
 * @returns Object with modal state and helper methods
 * 
 * @example
 * const { filterVisible, setFilterVisible, sections } = useFilterModal([
 *   createRadioFilter(t('status'), status, setStatus, options),
 *   createCheckboxFilter(t('types'), types, setTypes, options)
 * ]);
 * 
 * return (
 *   <>
 *     <TFButton onPress={() => setFilterVisible(true)} />
 *     <GenericFilterModal
 *       visible={filterVisible}
 *       sections={sections}
 *       onClose={() => setFilterVisible(false)}
 *     />
 *   </>
 * );
 */
export const useFilterModal = (initialSections: FilterSection[]) => {
  const [filterVisible, setFilterVisible] = useState(false);

  const sections = useMemo(() => initialSections, [initialSections]);

  return {
    filterVisible,
    setFilterVisible,
    sections,
    openFilter: () => setFilterVisible(true),
    closeFilter: () => setFilterVisible(false),
    toggleFilter: () => setFilterVisible(prev => !prev),
  };
};
