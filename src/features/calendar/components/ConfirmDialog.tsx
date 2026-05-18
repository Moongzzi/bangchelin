import type { ConfirmDialogTone } from '../types/calendar.types';
import { useEffect } from 'react';
import styles from './CalendarShared.module.css';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'brand',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  useEffect(() => {
    // increment modal counter and lock body scroll
    const prevCount = Number(document.body.dataset.modalCount ?? '0');
    const count = prevCount + 1;
    document.body.dataset.modalCount = String(count);

    if (prevCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.dataset.prevPaddingRight = document.body.style.paddingRight || '';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
    }

    return () => {
      const next = Number(document.body.dataset.modalCount ?? '1') - 1;
      if (next <= 0) {
        delete document.body.dataset.modalCount;
        const prev = document.body.dataset.prevPaddingRight ?? '';
        document.body.style.paddingRight = prev;
        delete document.body.dataset.prevPaddingRight;
        document.body.style.overflow = '';
      } else {
        document.body.dataset.modalCount = String(next);
      }
    };
  }, []);

  return (
    <div className={styles.confirmBackdrop}>
      <div className={styles.confirmCard} role="alertdialog" aria-modal="true" aria-labelledby="calendar-confirm-title">
        <h2 id="calendar-confirm-title" className={styles.confirmTitle}>{title}</h2>
        <p className={styles.confirmMessage}>{message}</p>

        <div className={styles.confirmFooter}>
          {cancelLabel ? (
            <button type="button" className={styles.confirmSecondaryButton} onClick={onCancel}>{cancelLabel}</button>
          ) : null}
          <button
            type="button"
            className={tone === 'danger' ? styles.confirmPrimaryButton : styles.confirmPrimaryButton}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
