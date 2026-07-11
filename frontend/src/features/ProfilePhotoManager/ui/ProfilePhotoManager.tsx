'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Profile, ProfileImageKind, User } from '@/shared/types';
import { useAppDispatch, useAppSelector } from '@/processes/store/hooks';
import { setAuthUser } from '@/processes/store/slices/authSlice';
import { translateError } from '@/shared/i18n/errors';
import {
  deleteProfileImageThunk,
  uploadProfileImageThunk,
} from '@/processes/store/slices/profileSlice';
import { readFileAsBase64, validateProfileImageFile } from '../model/imageCrop';
import { AvatarUploader } from './AvatarUploader';
import { CoverUploader } from './CoverUploader';
import styles from './ProfilePhotoManager.module.scss';

export function ProfilePhotoManager({ user, profile }: { user: User; profile: Profile | null }) {
  const { t } = useTranslation('profile');
  const { t: tErrors } = useTranslation('errors');
  const dispatch = useAppDispatch();
  const saving = useAppSelector((s) => s.profile.saving);
  const [busyKind, setBusyKind] = useState<ProfileImageKind | null>(null);
  const [localPreview, setLocalPreview] = useState<Record<ProfileImageKind, string | null>>({
    AVATAR: null,
    COVER: null,
  });
  const [errors, setErrors] = useState<Record<ProfileImageKind, string | null>>({
    AVATAR: null,
    COVER: null,
  });

  useEffect(() => {
    return () => {
      for (const value of Object.values(localPreview)) {
        if (value) URL.revokeObjectURL(value);
      }
    };
  }, [localPreview]);

  const upload = async (kind: ProfileImageKind, file: File) => {
    setErrors((current) => ({ ...current, [kind]: null }));
    const validation = validateProfileImageFile(kind, file);
    if (validation) {
      const message =
        validation.code === 'UNSUPPORTED_TYPE'
          ? t('photos.errors.unsupportedType')
          : t('photos.errors.tooLarge', {
              kind: t(kind === 'AVATAR' ? 'photos.avatar.title' : 'photos.cover.title'),
              maxSizeMb: validation.maxSizeMb,
            });
      setErrors((current) => ({ ...current, [kind]: message }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalPreview((current) => ({ ...current, [kind]: previewUrl }));
    setBusyKind(kind);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const payload = await dispatch(
        uploadProfileImageThunk({ kind, dataBase64, mimeType: file.type }),
      ).unwrap();
      dispatch(setAuthUser(payload.user));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [kind]: translateError(tErrors, error, 'uploadImage'),
      }));
    } finally {
      setBusyKind(null);
      setLocalPreview((current) => {
        const previous = current[kind];
        if (previous) URL.revokeObjectURL(previous);
        return { ...current, [kind]: null };
      });
    }
  };

  const remove = async (kind: ProfileImageKind) => {
    const confirmed = window.confirm(
      t(kind === 'AVATAR' ? 'photos.confirmDeleteAvatar' : 'photos.confirmDeleteCover'),
    );
    if (!confirmed) return;

    setErrors((current) => ({ ...current, [kind]: null }));
    setBusyKind(kind);
    try {
      const payload = await dispatch(deleteProfileImageThunk(kind)).unwrap();
      dispatch(setAuthUser(payload.user));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [kind]: translateError(tErrors, error, 'deleteImage'),
      }));
    } finally {
      setBusyKind(null);
    }
  };

  const fallbackLabel = (user.nickname || user.name || user.email || 'A').charAt(0).toUpperCase();

  return (
    <div className={styles['photo-manager']}>
      <div className={styles['photo-header']}>
        <span className="eyebrow">{t('photos.eyebrow')}</span>
        <h2>{t('photos.title')}</h2>
      </div>
      <div className={styles['photo-grid']}>
        <AvatarUploader
          imageUrl={user.avatarUrl}
          localPreview={localPreview.AVATAR}
          fallbackLabel={fallbackLabel}
          busy={saving && busyKind === 'AVATAR'}
          error={errors.AVATAR}
          onFile={(file) => upload('AVATAR', file)}
          onDelete={() => remove('AVATAR')}
        />
        <CoverUploader
          imageUrl={profile?.coverSrc}
          localPreview={localPreview.COVER}
          busy={saving && busyKind === 'COVER'}
          error={errors.COVER}
          onFile={(file) => upload('COVER', file)}
          onDelete={() => remove('COVER')}
        />
      </div>
    </div>
  );
}
