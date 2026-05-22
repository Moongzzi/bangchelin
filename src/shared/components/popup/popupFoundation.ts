export const popupFoundation = {
  portalRootId: 'popup-root',
  maxWidth: 'min(calc(100vw - 2rem), 32rem)',
  maxHeight: 'min(calc(100vh - 2rem), 42rem)',
  sizePresets: {
    sm: '22rem',
    md: '24rem',
    lg: '30rem',
  },
} as const;

export type PopupFoundation = typeof popupFoundation;