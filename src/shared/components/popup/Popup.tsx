import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import styles from './Popup.module.css';
import { popupFoundation } from './popupFoundation';

type PopupRole = 'dialog' | 'alertdialog';
export type PopupSize = keyof typeof popupFoundation.sizePresets;
export type PopupActionVariant = 'filled' | 'outline' | 'text';
export type PopupActionTone = 'brand' | 'neutral';

export type PopupAction = {
  key?: string;
  label: string;
  onClick?: () => void;
  variant?: PopupActionVariant;
  tone?: PopupActionTone;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  ariaLabel?: string;
  autoFocus?: boolean;
  closeOnClick?: boolean;
  className?: string;
};

export type PopupProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  actions?: PopupAction[];
  className?: string;
  children?: ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  ariaLabel?: string;
  role?: PopupRole;
  size?: PopupSize;
  maxWidth?: number | string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  hideCloseButton?: boolean;
  preventScrollLock?: boolean;
};

type PopupHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  titleId?: string;
  descriptionId?: string;
  hideCloseButton?: boolean;
  onClose?: () => void;
};

type PopupActionsProps = {
  actions?: PopupAction[];
  onClose: () => void;
};

type PopupPanelProps = HTMLAttributes<HTMLDivElement> & {
  size?: PopupSize;
  maxWidth?: number | string;
  role?: PopupRole;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
};

type PopupCustomProperties = CSSProperties & {
  '--popup-width': string;
  '--popup-max-width': string;
  '--popup-max-height': string;
};

function joinClassNames(...classNames: Array<string | undefined | false>) {
  return classNames.filter(Boolean).join(' ');
}

function getPopupPortalRoot() {
  if (typeof document === 'undefined') {
    return null;
  }

  const existingRoot = document.getElementById(popupFoundation.portalRootId);
  if (existingRoot) {
    return existingRoot;
  }

  const nextRoot = document.createElement('div');
  nextRoot.id = popupFoundation.portalRootId;
  document.body.append(nextRoot);
  return nextRoot;
}

function getFocusableElements(root: HTMLElement | null) {
  if (!root) {
    return [] as HTMLElement[];
  }

  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element) => !element.hasAttribute('hidden'));
}

function trapFocus(event: React.KeyboardEvent<HTMLDivElement>, panel: HTMLDivElement | null) {
  if (event.key !== 'Tab' || !panel) {
    return;
  }

  const focusableElements = getFocusableElements(panel);

  if (focusableElements.length === 0) {
    event.preventDefault();
    panel.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (!firstElement || !lastElement) {
    panel.focus();
    return;
  }

  const activeElement = document.activeElement;

  if (event.shiftKey) {
    if (activeElement === firstElement || activeElement === panel) {
      event.preventDefault();
      lastElement.focus();
    }
    return;
  }

  if (activeElement === lastElement || !panel.contains(activeElement)) {
    event.preventDefault();
    firstElement.focus();
  }
}

function useBodyScrollLock(open: boolean, preventScrollLock: boolean) {
  useEffect(() => {
    if (!open || preventScrollLock || typeof document === 'undefined') {
      return;
    }

    const previousCount = Number(document.body.dataset.modalCount ?? '0');
    const nextCount = previousCount + 1;

    document.body.dataset.modalCount = String(nextCount);

    if (previousCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.dataset.prevPaddingRight = document.body.style.paddingRight || '';

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      document.body.style.overflow = 'hidden';
    }

    return () => {
      const count = Number(document.body.dataset.modalCount ?? '1') - 1;

      if (count <= 0) {
        delete document.body.dataset.modalCount;

        const previousPaddingRight = document.body.dataset.prevPaddingRight ?? '';
        document.body.style.paddingRight = previousPaddingRight;
        delete document.body.dataset.prevPaddingRight;
        document.body.style.overflow = '';
        return;
      }

      document.body.dataset.modalCount = String(count);
    };
  }, [open, preventScrollLock]);
}

export function PopupOverlay({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={joinClassNames(styles.overlay, className)} {...props}>
      {children}
    </div>
  );
}

export const PopupPanel = forwardRef<HTMLDivElement, PopupPanelProps>(function PopupPanel(
  {
    className,
    children,
    size = 'md',
    maxWidth,
    role = 'dialog',
    ariaLabel,
    ariaLabelledby,
    ariaDescribedby,
    ...props
  },
  ref,
) {
  const resolvedMaxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth ?? popupFoundation.maxWidth;
  const popupStyle: PopupCustomProperties = {
    '--popup-width': popupFoundation.sizePresets[size],
    '--popup-max-width': resolvedMaxWidth,
    '--popup-max-height': popupFoundation.maxHeight,
  };

  return (
    <div
      {...props}
      ref={ref}
      role={role}
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      tabIndex={-1}
      className={joinClassNames(styles.panel, className)}
      style={popupStyle}
    >
      {children}
    </div>
  );
});

export function PopupHeader({
  title,
  description,
  titleId,
  descriptionId,
  hideCloseButton = true,
  onClose,
}: PopupHeaderProps) {
  if (!title && !description && hideCloseButton) {
    return null;
  }

  return (
    <header className={joinClassNames(styles.header, !hideCloseButton && styles.headerWithClose)}>
      {title ? (
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
      ) : null}

      {description ? (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      ) : null}

      {!hideCloseButton && onClose ? (
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="팝업 닫기">
          <span aria-hidden="true" className={styles.closeGlyph}>x</span>
        </button>
      ) : null}
    </header>
  );
}

export function PopupBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={joinClassNames(styles.body, className)} {...props}>
      {children}
    </div>
  );
}

export function PopupActions({ actions, onClose }: PopupActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className={styles.actions} data-count={actions.length}>
      {actions.map((action, index) => {
        const variant = action.variant ?? 'filled';
        const tone = action.tone ?? 'brand';
        const variantClassName =
          variant === 'outline' ? styles.actionOutline : variant === 'text' ? styles.actionText : styles.actionFilled;
        const toneClassName = tone === 'neutral' ? styles.actionToneNeutral : styles.actionToneBrand;

        return (
          <button
            key={action.key ?? `${action.label}-${index}`}
            type={action.type ?? 'button'}
            className={joinClassNames(styles.actionButton, variantClassName, toneClassName, action.className)}
            onClick={() => {
              action.onClick?.();

              if (action.closeOnClick) {
                onClose();
              }
            }}
            disabled={action.disabled}
            aria-label={action.ariaLabel}
            autoFocus={action.autoFocus}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

export function Popup({
  open,
  onClose,
  title,
  description,
  actions,
  className,
  children,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  ariaLabel,
  role = 'dialog',
  size = 'md',
  maxWidth,
  initialFocusRef,
  hideCloseButton = true,
  preventScrollLock = false,
}: PopupProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useBodyScrollLock(open, preventScrollLock);

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const nextFocusTarget = initialFocusRef?.current ?? getFocusableElements(panel)[0] ?? panel;
    nextFocusTarget.focus();

    return () => {
      previousActiveElement?.focus();
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open || !closeOnEscape || typeof document === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOnEscape, onClose, open]);

  if (!open) {
    return null;
  }

  const portalRoot = getPopupPortalRoot();

  if (!portalRoot) {
    return null;
  }

  const labelledBy = title ? titleId : undefined;
  const describedBy = description ? descriptionId : undefined;

  return createPortal(
    <PopupOverlay
      onClick={(event) => {
        if (event.target === event.currentTarget && closeOnOverlayClick) {
          onClose();
        }
      }}
    >
      <PopupPanel
        ref={panelRef}
        className={className}
        size={size}
        maxWidth={maxWidth}
        role={role}
        ariaLabel={ariaLabel}
        ariaLabelledby={labelledBy}
        ariaDescribedby={describedBy}
        onKeyDown={(event) => trapFocus(event, panelRef.current)}
      >
        <PopupHeader
          title={title}
          description={description}
          titleId={titleId}
          descriptionId={descriptionId}
          hideCloseButton={hideCloseButton}
          onClose={onClose}
        />
        {children ? <PopupBody>{children}</PopupBody> : null}
        <PopupActions actions={actions} onClose={onClose} />
      </PopupPanel>
    </PopupOverlay>,
    portalRoot,
  );
}