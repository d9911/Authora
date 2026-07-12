'use client';

// Денис: файл создан или изменён по запросу пользователя.

import { ChangeEvent, ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ButtonMain, FeedbackText } from '@/shared/ui';
import { PROFILE_IMAGE_ACCEPT } from '../model/imageCrop';
import styles from './ProfilePhotoManager.module.scss';

interface ProfileImageUploaderPanelProps {
  ariaLabel: string;
  title: string;
  description: string;
  imageUrl?: string;
  localPreview?: string | null;
  previewClassName: string;
  imageAlt: string;
  fallback: ReactNode;
  uploadLabel: string;
  replaceLabel: string;
  busy: boolean;
  error?: string | null;
  onFile: (file: File) => void;
  onDelete: () => void;
}

export function ProfileImageUploaderPanel({
  ariaLabel,
  title,
  description,
  imageUrl,
  localPreview,
  previewClassName,
  imageAlt,
  fallback,
  uploadLabel,
  replaceLabel,
  busy,
  error,
  onFile,
  onDelete,
}: ProfileImageUploaderPanelProps) {
  const { t } = useTranslation('profile');
  const inputRef = useRef<HTMLInputElement>(null);
  const src = localPreview ?? imageUrl;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onFile(file);
  };

  return (
    <section className={styles['photo-panel']} aria-label={ariaLabel}>
      <div className={previewClassName}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={imageAlt} />
        ) : (
          fallback
        )}
      </div>
      <div className={styles['photo-copy']}>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className={styles['photo-actions']}>
          <input
            ref={inputRef}
            className={styles['file-input']}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            tabIndex={-1}
            disabled={busy}
            aria-label={t('photos.accessibility.chooseImage', { title })}
            onChange={onChange}
          />
          <ButtonMain type="button" size="small" loading={busy} onClick={() => inputRef.current?.click()}>
            {imageUrl ? replaceLabel : uploadLabel}
          </ButtonMain>
          {imageUrl && (
            <ButtonMain type="button" size="small" variant="danger" disabled={busy} onClick={onDelete}>
              {t('photos.actions.delete')}
            </ButtonMain>
          )}
        </div>
        {error && <FeedbackText className={styles['photo-error']} tone="error">{error}</FeedbackText>}
      </div>
    </section>
  );
}
