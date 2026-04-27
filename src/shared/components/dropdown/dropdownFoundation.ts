export const dropdownFoundation = {
  sizes: {
    triggerMinHeight: 96,
    optionMinHeight: 96,
    icon: 28,
  },
  spacing: {
    labelGap: 18,
    triggerPaddingX: 32,
    optionPaddingX: 40,
    menuPaddingY: 6,
  },
  borderWidth: {
    default: 1,
  },
} as const;

export type DropdownFoundation = typeof dropdownFoundation;