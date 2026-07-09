'use client';

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
  return (
    <ProfileImageUploaderPanel
      ariaLabel="Avatar image"
      title="Avatar"
      description="Stored as a centered 512x512 WebP image and displayed round."
      imageUrl={imageUrl}
      localPreview={localPreview}
      previewClassName={styles['avatar-preview']}
      imageAlt="Avatar preview"
      fallback={<span>{fallbackLabel}</span>}
      uploadLabel="Upload avatar"
      replaceLabel="Replace avatar"
      busy={busy}
      error={error}
      onFile={onFile}
      onDelete={onDelete}
    />
  );
}
