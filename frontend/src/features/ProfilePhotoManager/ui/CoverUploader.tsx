'use client';

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
  return (
    <ProfileImageUploaderPanel
      ariaLabel="Cover image"
      title="Cover"
      description="Stored as a centered 1920x640 WebP image for the profile background."
      imageUrl={imageUrl}
      localPreview={localPreview}
      previewClassName={styles['cover-preview']}
      imageAlt="Cover preview"
      fallback={<span>No cover image</span>}
      uploadLabel="Upload cover"
      replaceLabel="Replace cover"
      busy={busy}
      error={error}
      onFile={onFile}
      onDelete={onDelete}
    />
  );
}
