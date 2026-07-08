'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { clearProfileFlags, loadMyProfileThunk, updateProfileThunk } from '@/processes/store/slices/profileSlice'
import { loadMeThunk } from '@/processes/store/slices/authSlice'
import { ButtonMain, InputMain } from '@/shared/ui'
import { ProfilePhotoManager } from '@/features/ProfilePhotoManager/ui/ProfilePhotoManager'

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
  const { profile, saving, saved, error, loading } = useAppSelector((s) => s.profile)

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(loadMeThunk())
    }
  }, [dispatch, status])

  useEffect(() => {
    if (status === 'authenticated' && profile === null && !loading) {
      void dispatch(loadMyProfileThunk())
    }
  }, [dispatch, loading, profile, status])

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

  const set = (key: keyof typeof emptyForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    dispatch(clearProfileFlags())
    const payload = {
      ...form,
      dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
      cityId: form.cityId || undefined,
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
          <InputMain label="City ID" value={form.cityId} onChange={set('cityId')} />
          <InputMain label="Date of birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          <InputMain label="Gender" value={form.gender} onChange={set('gender')} />
          <InputMain label="Address" value={form.address} onChange={set('address')} />
          <InputMain label="Timezone" value={form.timezone} onChange={set('timezone')} placeholder="Europe/Moscow" />
        </div>
        <InputMain label="Bio" value={form.bio} onChange={set('bio')} />
        <InputMain label="Description" value={form.description} onChange={set('description')} />

        {error && <p className="error-text">{error}</p>}
        {saved && <p className="success-text">Profile saved ✓</p>}
        <ButtonMain type="submit" loading={saving} style={{ marginTop: 8 }}>
          Save changes
        </ButtonMain>
      </form>
    </>
  )
}
