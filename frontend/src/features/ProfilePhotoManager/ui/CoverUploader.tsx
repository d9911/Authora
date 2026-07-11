'use client';

import { useTranslation } from 'react-i18next';
import { ProfileImageUploaderPanel } from './ProfileImageUploaderPanel';
import styles from './ProfilePhotoManager.module.scss';

interface CoverUploaderProps {
  imageUrl?: string;
  localPreview?: string | null;
  busy: boolean;
  error?: string | null;
  onFile: (file: File) => void;
  onDelete: () => void;
}

export function CoverUploader({
  imageUrl,
  localPreview,
  busy,
  error,
  onFile,
  onDelete,
}: CoverUploaderProps) {
  const { t } = useTranslation('profile');

  return (
    <ProfileImageUploaderPanel
      ariaLabel={t('photos.cover.ariaLabel')}
      title={t('photos.cover.title')}
      description={t('photos.cover.description')}
      imageUrl={imageUrl}
      localPreview={localPreview}
      previewClassName={styles['cover-preview']}
      imageAlt={t('photos.cover.previewAlt')}
      fallback={<span>{t('photos.cover.empty')}</span>}
      uploadLabel={t('photos.cover.upload')}
      replaceLabel={t('photos.cover.replace')}
      busy={busy}
      error={error}
      onFile={onFile}
      onDelete={onDelete}
    />
  );
}
