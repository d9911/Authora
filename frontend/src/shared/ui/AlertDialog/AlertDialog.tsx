// Денис: файл создан или изменён по запросу пользователя.
'use client';

import { type ReactNode, type RefObject, useId } from 'react';
import { ButtonMain } from '../ButtonMain/ButtonMain';
import { ModalMain } from '../ModalMain/ModalMain';
import styles from './AlertDialog.module.scss';

export interface AlertDialogProps {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  closeLabel?: string;
  busy?: boolean;
  confirmTone?: 'primary' | 'danger';
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}

export function AlertDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  closeLabel = cancelLabel,
  busy = false,
  confirmTone = 'danger',
  initialFocusRef,
  className,
}: AlertDialogProps) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const descriptionId = `alert-dialog-description-${generatedId}`;

  const cancel = () => {
    if (!busy) onCancel();
  };

  const confirm = () => {
    if (!busy) onConfirm();
  };

  return (
    <ModalMain
      open={open}
      role="alertdialog"
      title={title}
      closeLabel={closeLabel}
      descriptionId={descriptionId}
      initialFocusRef={initialFocusRef}
      closeOnEscape={!busy}
      closeOnBackdrop={!busy}
      closeDisabled={busy}
      className={className}
      onClose={cancel}
      footer={
        <>
          <ButtonMain type="button" variant="secondary" disabled={busy} onClick={cancel}>
            {cancelLabel}
          </ButtonMain>
          <ButtonMain
            type="button"
            variant={confirmTone}
            loading={busy}
            disabled={busy}
            onClick={confirm}
          >
            {confirmLabel}
          </ButtonMain>
        </>
      }
    >
      <div id={descriptionId} className={styles.description}>
        {description}
      </div>
    </ModalMain>
  );
}
