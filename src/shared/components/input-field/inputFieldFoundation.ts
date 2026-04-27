export const inputFieldFoundation = {
  sizes: {
    labelGap: 14,
    underlineHeight: 56,
    outlinedHeight: 76,
    clearButton: 32,
    clearIcon: 14,
  },
  spacing: {
    messageGap: 10,
    fieldPaddingX: 12,
    outlinedPaddingY: 18,
  },
  borderWidth: {
    default: 1,
    active: 1,
    outlined: 1,
  },
} as const;

export type InputFieldFoundation = typeof inputFieldFoundation;