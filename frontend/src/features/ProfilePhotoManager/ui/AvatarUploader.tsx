'use client';

import { ChangeEvent, useRef } from 'react';
import { ButtonMain } from '@/shared/ui';
import { PROFILE_IMAGE_ACCEPT } from '../model/imageCrop';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const src = localPreview ?? imageUrl;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFile(file);
  };

  return (
    <section className={styles['photo-panel']} aria-label="Avatar image">
      <div className={styles['avatar-preview']}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Avatar preview" />
        ) : (
          <span>{fallbackLabel}</span>
        )}
      </div>
      <div className={styles['photo-copy']}>
        <h3>Avatar</h3>
        <p>Stored as a centered 512x512 WebP image and displayed round.</p>
        <div className={styles['photo-actions']}>
          <input
            ref={inputRef}
            className={styles['file-input']}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            aria-label="Choose avatar image"
            onChange={onChange}
          />
          <ButtonMain type="button" size="small" loading={busy} onClick={() => inputRef.current?.click()}>
            {imageUrl ? 'Replace avatar' : 'Upload avatar'}
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
