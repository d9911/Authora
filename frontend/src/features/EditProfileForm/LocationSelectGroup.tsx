'use client';

import { useTranslation } from 'react-i18next';
import { Country, City, Region } from '@/shared/types';
import { SelectMain } from '@/shared/ui';

interface LocationSelectGroupProps {
  countries: Country[];
  regions: Region[];
  cities: City[];
  selectedCountryId: string;
  selectedRegionId: string;
  cityId: string;
  loading: boolean;
  onCountryChange: (countryId: string) => void;
  onRegionChange: (regionId: string) => void;
  onCityChange: (cityId: string) => void;
}

interface SelectFieldProps {
  label: string;
  value: string;
  placeholder: string;
  disabled?: boolean;
  options: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
}

function SelectField({ label, value, placeholder, disabled, options, onChange }: SelectFieldProps) {
  return (
    <SelectMain
      label={label}
      value={value || null}
      placeholder={placeholder}
      disabled={disabled}
      clearable
      options={options.map((option) => ({
        value: option.id,
        label: option.name,
      }))}
      onChange={(nextValue) => onChange(nextValue ?? '')}
    />
  );
}

export function LocationSelectGroup({
  countries,
  regions,
  cities,
  selectedCountryId,
  selectedRegionId,
  cityId,
  loading,
  onCountryChange,
  onRegionChange,
  onCityChange,
}: LocationSelectGroupProps) {
  const { t } = useTranslation('profile');

  return (
    <>
      <SelectField
        label={t('edit.location.country.label')}
        value={selectedCountryId}
        placeholder={t('edit.location.country.placeholder')}
        options={countries}
        onChange={onCountryChange}
      />
      <SelectField
        label={t('edit.location.region.label')}
        value={selectedRegionId}
        placeholder={t('edit.location.region.placeholder')}
        options={regions}
        disabled={!selectedCountryId || loading}
        onChange={onRegionChange}
      />
      <SelectField
        label={t('edit.location.city.label')}
        value={cityId}
        placeholder={t('edit.location.city.placeholder')}
        options={cities}
        disabled={!selectedCountryId || loading}
        onChange={onCityChange}
      />
    </>
  );
}
