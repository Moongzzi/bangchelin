import type { CSSProperties } from 'react';

import styles from './CalendarShared.module.css';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  onLabel?: string;
  offLabel?: string;
  style?: CSSProperties;
};

export function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
  onLabel = 'On',
  offLabel = 'Off',
  style,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className={styles.toggleSwitch}
      style={style}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.toggleSwitchTrack}>
        <span className={styles.toggleSwitchThumb} aria-hidden="true" />
      </span>
      <span className={styles.toggleSwitchState}>{checked ? onLabel : offLabel}</span>
    </button>
  );
}
