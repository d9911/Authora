// Денис: файл создан или изменён по запросу пользователя.
'use client';

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import styles from './ModalMain.module.scss';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalMainProps {
  open: boolean;
  title: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  role?: 'dialog' | 'alertdialog';
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  closeDisabled?: boolean;
  className?: string;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.hasAttribute('hidden') &&
      !element.matches(':disabled') &&
      element.getClientRects().length > 0,
  );
}

interface ModalStackEntry {
  overlay: HTMLElement;
  content: HTMLElement;
  previouslyFocused: HTMLElement | null;
  getInitialFocusTarget: () => HTMLElement | null;
  onClose: () => void;
  canCloseOnEscape: () => boolean;
  focusFrame: number | null;
}

interface ModalDocumentState {
  document: Document;
  previousBodyOverflow: string;
  siblingInertStates: Map<HTMLElement, boolean>;
  initiallyFocused: HTMLElement | null;
}

const modalStack: ModalStackEntry[] = [];
let modalDocumentState: ModalDocumentState | null = null;

function getTopModal(): ModalStackEntry | undefined {
  return modalStack[modalStack.length - 1];
}

function focusModal(
  entry: ModalStackEntry,
  preferredTarget: HTMLElement | null = null,
) {
  const requestedTarget = preferredTarget ?? entry.getInitialFocusTarget();
  const target =
    requestedTarget?.isConnected && entry.content.contains(requestedTarget)
      ? requestedTarget
      : (getFocusableElements(entry.content)[0] ?? entry.content);
  target.focus({ preventScroll: true });
}

function scheduleModalFocus(
  entry: ModalStackEntry,
  preferredTarget: HTMLElement | null = null,
) {
  if (entry.focusFrame !== null) {
    window.cancelAnimationFrame(entry.focusFrame);
  }

  entry.focusFrame = window.requestAnimationFrame(() => {
    entry.focusFrame = null;
    if (getTopModal() === entry) {
      focusModal(entry, preferredTarget);
    }
  });
}

function applyModalDocumentState() {
  const state = modalDocumentState;
  const topModal = getTopModal();
  if (!state || !topModal) return;

  for (const element of Array.from(state.document.body.children)) {
    if (!(element instanceof HTMLElement)) continue;
    if (!state.siblingInertStates.has(element)) {
      state.siblingInertStates.set(element, element.inert);
    }
    element.inert = element !== topModal.overlay;
  }
  state.document.body.style.overflow = 'hidden';
}

function handleModalKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return;

  const topModal = getTopModal();
  if (!topModal) return;

  if (event.key === 'Escape' && topModal.canCloseOnEscape()) {
    event.preventDefault();
    topModal.onClose();
    return;
  }

  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements(topModal.content);
  if (focusableElements.length === 0) {
    event.preventDefault();
    topModal.content.focus({ preventScroll: true });
    return;
  }

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  const activeElement = topModal.content.ownerDocument.activeElement;

  if (
    event.shiftKey &&
    (activeElement === first || !topModal.content.contains(activeElement))
  ) {
    event.preventDefault();
    last.focus({ preventScroll: true });
  } else if (
    !event.shiftKey &&
    (activeElement === last || !topModal.content.contains(activeElement))
  ) {
    event.preventDefault();
    first.focus({ preventScroll: true });
  }
}

function registerModal(entry: ModalStackEntry) {
  const ownerDocument = entry.overlay.ownerDocument;

  if (modalStack.length === 0) {
    modalDocumentState = {
      document: ownerDocument,
      previousBodyOverflow: ownerDocument.body.style.overflow,
      siblingInertStates: new Map(),
      initiallyFocused: entry.previouslyFocused,
    };
    ownerDocument.addEventListener('keydown', handleModalKeyDown);
  }

  modalStack.push(entry);
  applyModalDocumentState();
  scheduleModalFocus(entry);
}

function unregisterModal(entry: ModalStackEntry) {
  const entryIndex = modalStack.indexOf(entry);
  if (entryIndex === -1) return;

  const wasTopModal = entryIndex === modalStack.length - 1;
  modalStack.splice(entryIndex, 1);
  if (entry.focusFrame !== null) {
    window.cancelAnimationFrame(entry.focusFrame);
    entry.focusFrame = null;
  }

  const state = modalDocumentState;
  const remainingTopModal = getTopModal();
  if (state && remainingTopModal) {
    applyModalDocumentState();
    if (wasTopModal) {
      scheduleModalFocus(remainingTopModal, entry.previouslyFocused);
    }
    return;
  }

  if (!state) return;

  state.document.removeEventListener('keydown', handleModalKeyDown);
  state.document.body.style.overflow = state.previousBodyOverflow;
  for (const [element, wasInert] of state.siblingInertStates) {
    element.inert = wasInert;
  }
  modalDocumentState = null;
  state.initiallyFocused?.focus({ preventScroll: true });
}

export function ModalMain({
  open,
  title,
  closeLabel,
  onClose,
  children,
  footer,
  role = 'dialog',
  descriptionId,
  initialFocusRef,
  closeOnEscape = true,
  closeOnBackdrop = true,
  closeDisabled = false,
  className,
}: ModalMainProps) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `modal-title-${generatedId}`;
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const closeDisabledRef = useRef(closeDisabled);

  onCloseRef.current = onClose;
  closeOnEscapeRef.current = closeOnEscape;
  closeDisabledRef.current = closeDisabled;

  useEffect(() => {
    if (!open) return;

    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content) return;

    const entry: ModalStackEntry = {
      overlay,
      content,
      previouslyFocused:
        document.activeElement instanceof HTMLElement ? document.activeElement : null,
      getInitialFocusTarget: () => initialFocusRef?.current ?? null,
      onClose: () => onCloseRef.current(),
      canCloseOnEscape: () =>
        closeOnEscapeRef.current && !closeDisabledRef.current,
      focusFrame: null,
    };
    registerModal(entry);

    return () => {
      unregisterModal(entry);
    };
  }, [initialFocusRef, open]);

  if (!open || typeof document === 'undefined') return null;

  const handleBackdropPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.target === event.currentTarget &&
      closeOnBackdrop &&
      !closeDisabled &&
      getTopModal()?.overlay === overlayRef.current
    ) {
      onClose();
    }
  };

  return createPortal(
    <div
      ref={overlayRef}
      className={styles['modal-overlay']}
      onPointerDown={handleBackdropPointerDown}
    >
      <div
        ref={contentRef}
        className={`${styles['modal-content']} ${className ?? ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className={styles['modal-header']}>
          <h2 id={titleId} className={styles['modal-title']}>
            {title}
          </h2>
          <button
            type="button"
            className={styles['modal-close']}
            aria-label={closeLabel}
            disabled={closeDisabled}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className={styles['modal-body']}>{children}</div>
        {footer ? <footer className={styles['modal-footer']}>{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
