'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks'
import { clearProfileFlags, loadMyProfileThunk, updateProfileThunk } from '@/processes/store/slices/profileSlice'
import { loadMeThunk } from '@/processes/store/slices/authSlice'
import { loadCountriesThunk, loadCountryByIdThunk } from '@/processes/store/slices/locationSlice'
import { fetchCityById } from '@/entities/country/api/locationApi'
import { ButtonMain, FeedbackText, InputMain } from '@/shared/ui'
import { ProfilePhotoManager } from '@/features/ProfilePhotoManager/ui/ProfilePhotoManager'
import { LocationSelectGroup } from './LocationSelectGroup'

const emptyForm = {
  name: '',
  nickname: '',
  phoneNumber: '',
  bio: '',
  description: '',
  cityId: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  timezone: '',
}

export function EditProfileForm() {
  const dispatch = useAppDispatch()
  const { user, status } = useAppSelector((s) => s.auth)
  const {
    profile,
    loaded: profileLoaded,
    saving,
    saved,
    error,
    loading,
  } = useAppSelector((s) => s.profile)
  const {
    countries,
    loaded: locationsLoaded,
    current: currentCountry,
    loading: locationsLoading,
  } = useAppSelector((s) => s.location)

  const [form, setForm] = useState(emptyForm)
  const [selectedCountryId, setSelectedCountryId] = useState('')
  const [selectedRegionId, setSelectedRegionId] = useState('')

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(loadMeThunk())
    }
  }, [dispatch, status])

  useEffect(() => {
    if (status === 'authenticated' && !profileLoaded && !loading) {
      void dispatch(loadMyProfileThunk())
    }
  }, [dispatch, loading, profileLoaded, status])

  useEffect(() => {
    if (status === 'authenticated' && !locationsLoaded && !locationsLoading) {
      void dispatch(loadCountriesThunk())
    }
  }, [dispatch, locationsLoaded, locationsLoading, status])

  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: user?.name ?? f.name,
      nickname: user?.nickname ?? f.nickname,
      phoneNumber: user?.phoneNumber ?? f.phoneNumber,
    }))
  }, [user])

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        bio: profile.bio ?? '',
        description: profile.description ?? '',
        cityId: profile.cityId ?? '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
        gender: profile.gender ?? '',
        address: profile.address ?? '',
        timezone: profile.timezone ?? '',
      }))
    }
  }, [profile])

  useEffect(() => {
    let cancelled = false
    const cityId = profile?.cityId

    if (!cityId) {
      setSelectedCountryId('')
      setSelectedRegionId('')
      return
    }

    fetchCityById(cityId)
      .then((city) => {
        if (cancelled) return
        const countryId = city?.countryId ?? ''
        setSelectedCountryId(countryId)
        setSelectedRegionId(city?.regionId ?? '')
        if (countryId) {
          void dispatch(loadCountryByIdThunk(countryId))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedCountryId('')
          setSelectedRegionId('')
        }
      })

    return () => {
      cancelled = true
    }
  }, [dispatch, profile?.cityId])

  const set = (key: keyof typeof emptyForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const selectedCountry = currentCountry?.id === selectedCountryId ? currentCountry : null
  const regions = selectedCountry?.regions ?? []
  const cities = useMemo(() => {
    const allCities = selectedCountry?.cities ?? []
    return selectedRegionId ? allCities.filter((city) => city.regionId === selectedRegionId) : allCities
  }, [selectedCountry?.cities, selectedRegionId])

  const onCountryChange = (countryId: string) => {
    setSelectedCountryId(countryId)
    setSelectedRegionId('')
    setForm((f) => ({ ...f, cityId: '' }))
    if (countryId) {
      void dispatch(loadCountryByIdThunk(countryId))
    }
  }

  const onRegionChange = (regionId: string) => {
    setSelectedRegionId(regionId)
    setForm((f) => ({ ...f, cityId: '' }))
  }

  const onCityChange = (cityId: string) => {
    setForm((f) => ({ ...f, cityId }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    dispatch(clearProfileFlags())
    const payload = {
      ...form,
      dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
      cityId: form.cityId || null,
    }
    await dispatch(updateProfileThunk(payload))
  }

  if (loading) return <p className="muted">Loading profile…</p>

  return (
    <>
      {user && <ProfilePhotoManager user={user} profile={profile} />}
      <form onSubmit={onSubmit} className="card">
        <h2>Edit profile</h2>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InputMain label="Name" value={form.name} onChange={set('name')} />
          <InputMain label="Nickname" value={form.nickname} onChange={set('nickname')} />
          <InputMain label="Phone number" value={form.phoneNumber} onChange={set('phoneNumber')} />
          <LocationSelectGroup
            countries={countries}
            regions={regions}
            cities={cities}
            selectedCountryId={selectedCountryId}
            selectedRegionId={selectedRegionId}
            cityId={form.cityId}
            loading={locationsLoading}
            onCountryChange={onCountryChange}
            onRegionChange={onRegionChange}
            onCityChange={onCityChange}
          />
          <InputMain label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          <InputMain label="Gender" value={form.gender} onChange={set('gender')} />
          <InputMain label="Address" value={form.address} onChange={set('address')} />
          <InputMain label="Timezone" value={form.timezone} onChange={set('timezone')} placeholder="Europe/Moscow" />
        </div>
        <InputMain label="Bio" value={form.bio} onChange={set('bio')} />
        <InputMain label="Description" value={form.description} onChange={set('description')} />

        {error && <FeedbackText tone="error">{error}</FeedbackText>}
        {saved && <FeedbackText tone="success">Profile saved ✓</FeedbackText>}
        <ButtonMain type="submit" loading={saving} style={{ marginTop: 8 }}>
          Save changes
        </ButtonMain>
      </form>
    </>
  )
}
