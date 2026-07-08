'use client';

import { ChangeEvent, useRef } from 'react';
import { ButtonMain } from '@/shared/ui';
import { PROFILE_IMAGE_ACCEPT } from '../model/imageCrop';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const src = localPreview ?? imageUrl;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFile(file);
  };

  return (
    <section className={styles['photo-panel']} aria-label="Cover image">
      <div className={styles['cover-preview']}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Cover preview" />
        ) : (
          <span>No cover image</span>
        )}
      </div>
      <div className={styles['photo-copy']}>
        <h3>Cover</h3>
        <p>Stored as a centered 1920x640 WebP image for the profile background.</p>
        <div className={styles['photo-actions']}>
          <input
            ref={inputRef}
            className={styles['file-input']}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            aria-label="Choose cover image"
            onChange={onChange}
          />
          <ButtonMain type="button" size="small" loading={busy} onClick={() => inputRef.current?.click()}>
            {imageUrl ? 'Replace cover' : 'Upload cover'}
          </ButtonMain>
          {imageUrl && (
            <ButtonMain type="button" size="small" variant="danger" disabled={busy} onClick={onDelete}>
              Delete
            </ButtonMain>
          )}
        </div>
        {error && (
          <p className={styles['photo-error']} role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
