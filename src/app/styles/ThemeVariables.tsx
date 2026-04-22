import { colors } from '../../shared/styles/tokens/colors';
import { foundation } from '../../shared/styles/tokens/foundation';
import { typography } from '../../shared/styles/tokens/typography';

const rootThemeVariables = `
  :root {
    color-scheme: light;
    --color-bg: ${colors.background.default};
    --color-surface: ${colors.surface.elevated};
    --color-surface-strong: ${colors.surface.default};
    --color-border: ${colors.border.default};
    --color-text: ${colors.text.primary};
    --color-text-muted: ${colors.text.secondary};
    --color-accent: ${colors.brand.primary};
    --color-accent-strong: ${colors.brand.primaryHover};
    --color-danger: ${colors.semantic.error};
    --shadow-soft: ${foundation.shadow.soft};
    --radius-sm: ${foundation.radius.sm};
    --radius-md: ${foundation.radius.md};
    --radius-lg: ${foundation.radius.lg};
    --space-content: ${foundation.layout.contentWidth};
    --font-sans: ${typography.fontFamily.base};
    --font-display: ${typography.fontFamily.heading};
  }
`;

export function ThemeVariables() {
  return <style>{rootThemeVariables}</style>;
}