import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { colors } from '../../styles/tokens/colors';
import styles from './Dropdown.module.css';

export type DropdownOptionValue = string;

export type DropdownOptionData = {
  value: DropdownOptionValue;
  label: string;
  disabled?: boolean;
};

export type DropdownProps = {
  label: string;
  options: DropdownOptionData[];
  value?: DropdownOptionValue;
  onChange: (value: DropdownOptionValue) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  required?: boolean;
  describedBy?: string;
  hideLabel?: boolean;
  fullWidth?: boolean;
  invalid?: boolean;
  helperText?: string;
};

type DropdownLabelProps = {
  id: string;
  htmlFor: string;
  label: string;
  hideLabel?: boolean;
};

type DropdownIconProps = {
  open: boolean;
};

type DropdownTriggerProps = {
  id: string;
  label: string;
  valueText: string;
  placeholder: boolean;
  open: boolean;
  disabled?: boolean;
  expanded: boolean;
  onClick: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  ariaDescribedBy?: string;
  invalid?: boolean;
};

type DropdownMenuProps = {
  id: string;
  labelledBy: string;
  open: boolean;
  children: ReactNode;
};

type DropdownOptionProps = {
  id: string;
  option: DropdownOptionData;
  selected: boolean;
  highlighted: boolean;
  onSelect: (option: DropdownOptionData) => void;
  onHover: () => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLLIElement>) => void;
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function getFirstEnabledIndex(options: DropdownOptionData[]) {
  return options.findIndex((option) => !option.disabled);
}

function getNextEnabledIndex(
  options: DropdownOptionData[],
  startIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) {
    return -1;
  }

  let index = startIndex;

  for (let steps = 0; steps < options.length; steps += 1) {
    index = (index + direction + options.length) % options.length;

    if (!options[index]?.disabled) {
      return index;
    }
  }

  return -1;
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4.5 8.5 7.5 7 7.5-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4.5 15.5 7.5-7 7.5 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DropdownLabel({ id, htmlFor, label, hideLabel = false }: DropdownLabelProps) {
  return (
    <label
      id={id}
      htmlFor={htmlFor}
      className={joinClassNames(styles.label, hideLabel && styles.hiddenLabel)}
    >
      {label}
    </label>
  );
}

export function DropdownIcon({ open }: DropdownIconProps) {
  return <span className={styles.icon}>{open ? <ChevronUpIcon /> : <ChevronDownIcon />}</span>;
}

export const DropdownTrigger = forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  function DropdownTrigger(
    {
      id,
      label,
      valueText,
      placeholder,
      open,
      disabled,
      expanded,
      onClick,
      onKeyDown,
      ariaDescribedBy,
      invalid,
    },
    forwardedRef,
  ) {
    return (
      <button
        ref={forwardedRef}
        id={id}
        type="button"
        className={joinClassNames(
          styles.trigger,
          open && styles.triggerOpen,
          disabled && styles.triggerDisabled,
        )}
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-label={label}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid ? true : undefined}
        disabled={disabled}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <span className={joinClassNames(styles.triggerText, placeholder && styles.placeholder)}>
          {valueText}
        </span>
        <DropdownIcon open={open} />
      </button>
    );
  },
);

DropdownTrigger.displayName = 'DropdownTrigger';

export function DropdownMenu({ id, labelledBy, open, children }: DropdownMenuProps) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-labelledby={labelledBy}
      className={joinClassNames(styles.menu, !open && styles.menuHidden)}
    >
      {children}
    </ul>
  );
}

export const DropdownOption = forwardRef<HTMLLIElement, DropdownOptionProps>(function DropdownOption(
  { id, option, selected, highlighted, onSelect, onHover, onKeyDown },
  forwardedRef,
) {
  return (
    <li
      ref={forwardedRef}
      id={id}
      role="option"
      aria-selected={selected}
      tabIndex={highlighted ? 0 : -1}
      className={joinClassNames(
        styles.option,
        selected && styles.optionSelected,
        highlighted && styles.optionHighlighted,
        option.disabled && styles.optionDisabled,
      )}
      onClick={() => {
        if (!option.disabled) {
          onSelect(option);
        }
      }}
      onMouseEnter={onHover}
      onKeyDown={onKeyDown}
    >
      {option.label}
    </li>
  );
});

DropdownOption.displayName = 'DropdownOption';

export const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(function Dropdown(
  {
    label,
    options,
    value,
    onChange,
    placeholder,
    disabled = false,
    className,
    id,
    name,
    open,
    defaultOpen = false,
    onOpenChange,
    required,
    describedBy,
    hideLabel = false,
    fullWidth = true,
    invalid = false,
    helperText,
  },
  forwardedRef,
) {
  const generatedId = useId();
  const dropdownId = id ?? `dropdown-${generatedId}`;
  const labelId = `${dropdownId}-label`;
  const menuId = `${dropdownId}-menu`;
  const helperId = helperText ? `${dropdownId}-helper` : undefined;
  const isControlledOpen = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const isOpen = isControlledOpen ? open : internalOpen;

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const valueText = selectedOption?.label ?? placeholder;
  const showingPlaceholder = !selectedOption;
  const resolvedDescribedBy = [describedBy, helperId].filter(Boolean).join(' ') || undefined;
  const dropdownStyle = {
    '--dropdown-label': colors.text.primary,
    '--dropdown-text': colors.text.tertiary,
    '--dropdown-placeholder': colors.text.tertiary,
    '--dropdown-outline': colors.border.default,
    '--dropdown-icon': colors.border.strong,
    '--dropdown-panel-outline': colors.border.subtle,
    '--dropdown-helper': colors.text.tertiary,
    '--dropdown-invalid': colors.semantic.error,
    '--dropdown-focus-ring': `${colors.accent.rose}33`,
  } as CSSProperties;

  function assignTriggerRef(node: HTMLButtonElement | null) {
    triggerRef.current = node;

    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
      return;
    }

    if (forwardedRef) {
      forwardedRef.current = node;
    }
  }

  function updateOpen(nextOpen: boolean) {
    if (!isControlledOpen) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function closeMenu() {
    updateOpen(false);
  }

  function openMenu() {
    if (disabled) {
      return;
    }

    updateOpen(true);
  }

  function selectOption(option: DropdownOptionData) {
    if (option.disabled) {
      return;
    }

    onChange(option.value);
    closeMenu();
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    const nextIndex = selectedIndex >= 0 ? selectedIndex : getFirstEnabledIndex(options);
    setHighlightedIndex(nextIndex);
  }, [isOpen, options, value]);

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) {
      return;
    }

    optionRefs.current[highlightedIndex]?.focus();
  }, [highlightedIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        closeMenu();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu();
      const startIndex =
        value !== undefined ? options.findIndex((option) => option.value === value) : -1;
      const nextIndex = getNextEnabledIndex(options, startIndex >= 0 ? startIndex : -1, event.key === 'ArrowDown' ? 1 : -1);
      setHighlightedIndex(nextIndex);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      updateOpen(!isOpen);
    }
  }

  function handleOptionKeyDown(index: number, option: DropdownOptionData) {
    return (event: ReactKeyboardEvent<HTMLLIElement>) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = getNextEnabledIndex(options, index, event.key === 'ArrowDown' ? 1 : -1);
        setHighlightedIndex(nextIndex);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectOption(option);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        triggerRef.current?.focus();
      }
    };
  }

  return (
    <div
      ref={rootRef}
      className={joinClassNames(styles.root, fullWidth && styles.fullWidth, className)}
      style={dropdownStyle}
    >
      <DropdownLabel id={labelId} htmlFor={dropdownId} label={label} hideLabel={hideLabel} />
      {name ? <input type="hidden" name={name} value={value ?? ''} required={required} /> : null}
      <DropdownTrigger
        ref={assignTriggerRef}
        id={dropdownId}
        label={label}
        valueText={valueText}
        placeholder={showingPlaceholder}
        open={isOpen}
        disabled={disabled}
        expanded={isOpen}
        onClick={() => updateOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        ariaDescribedBy={resolvedDescribedBy}
        invalid={invalid}
      />
      <DropdownMenu id={menuId} labelledBy={labelId} open={isOpen}>
        {options.map((option, index) => (
          <DropdownOption
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            id={`${dropdownId}-option-${index}`}
            option={option}
            selected={option.value === value}
            highlighted={highlightedIndex === index}
            onSelect={selectOption}
            onHover={() => setHighlightedIndex(index)}
            onKeyDown={handleOptionKeyDown(index, option)}
          />
        ))}
      </DropdownMenu>
      {helperText ? (
        <p
          id={helperId}
          className={joinClassNames(styles.helperText, invalid && styles.helperInvalid)}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';