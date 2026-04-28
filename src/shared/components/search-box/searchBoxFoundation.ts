export const searchBoxFoundation = {
  sizes: {
    fieldMinHeight: 80,
    icon: 40,
  },
  spacing: {
    paddingInline: 30,
    inputToIconGap: 20,
  },
  borderWidth: {
    default: 1,
  },
} as const;

export type SearchBoxFoundation = typeof searchBoxFoundation;