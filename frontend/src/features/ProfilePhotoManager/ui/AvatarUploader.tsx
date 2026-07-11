'use client';

import { useTranslation } from 'react-i18next';
import { ProfileImageUploaderPanel } from './ProfileImageUploaderPanel';
import styles from './ProfilePhotoManager.module.scss';

interface AvatarUploaderProps {
  imageUrl?: string;
  localPreview?: string | null;
  fallbackLabel: string;
  busy: boolean;
  error?: string | null;
  onFile: (file: File) => void;
  onDelete: () => void;
}

export function AvatarUploader({
  imageUrl,
  localPreview,
  fallbackLabel,
  busy,
  error,
  onFile,
  onDelete,
}: AvatarUploaderProps) {
  const { t } = useTranslation('profile');

  return (
    <ProfileImageUploaderPanel
      ariaLabel={t('photos.avatar.ariaLabel')}
      title={t('photos.avatar.title')}
      description={t('photos.avatar.description')}
      imageUrl={imageUrl}
      localPreview={localPreview}
      previewClassName={styles['avatar-preview']}
      imageAlt={t('photos.avatar.previewAlt')}
      fallback={<span>{fallbackLabel}</span>}
      uploadLabel={t('photos.avatar.upload')}
      replaceLabel={t('photos.avatar.replace')}
      busy={busy}
      error={error}
      onFile={onFile}
      onDelete={onDelete}
    />
  );
}
