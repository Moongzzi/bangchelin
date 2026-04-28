import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';

import { colors } from '../../styles/tokens/colors';
import styles from './SearchBox.module.css';

export type SearchBoxBackgroundVariant = 'subtle' | 'transparent';

type NativeInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'size' | 'value' | 'defaultValue' | 'onChange' | 'children'
>;

export type SearchBoxProps = NativeInputProps & {
  value?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  defaultValue?: string;
  onSearch?: (value: string) => void;
  onSubmit?: (value: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
  backgroundVariant?: SearchBoxBackgroundVariant;
  iconButton?: boolean;
  fullWidth?: boolean;
};

type SearchInputProps = {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  ariaLabel: string;
} & NativeInputProps;

type SearchIconProps = {
  asButton?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.75" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="m15 15 5 5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, placeholder, disabled, readOnly, autoFocus, ariaLabel, ...restProps },
  forwardedRef,
) {
  return (
    <input
      {...restProps}
      ref={forwardedRef}
      type="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      className={styles.input}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export function SearchIcon({ asButton = false, disabled, onClick }: SearchIconProps) {
  if (asButton) {
    return (
      <button
        type="button"
        className={styles.iconButton}
        onClick={onClick}
        aria-label="검색 실행"
        disabled={disabled}
      >
        <SearchGlyph />
      </button>
    );
  }

  return (
    <span className={styles.icon} aria-hidden="true">
      <SearchGlyph />
    </span>
  );
}

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox(
  {
    value,
    onChange,
    placeholder,
    disabled = false,
    className,
    defaultValue,
    onSearch,
    onSubmit,
    readOnly = false,
    autoFocus = false,
    ariaLabel = '검색어 입력',
    backgroundVariant = 'subtle',
    iconButton,
    fullWidth = true,
    id,
    name,
    ...restProps
  },
  forwardedRef,
) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? '');
    const inputRef = useRef<HTMLInputElement | null>(null);
    const currentValue = isControlled ? value ?? '' : internalValue;
    const shouldUseIconButton = Boolean(iconButton || onSearch || onSubmit);
    const rootStyle = {
      '--search-background':
        backgroundVariant === 'transparent' ? 'transparent' : colors.background.subtle,
      '--search-border': colors.border.subtle,
      '--search-text': colors.text.primary,
      '--search-placeholder': colors.text.primaryAlpha40,
      '--search-icon': colors.text.primary,
      '--search-focus-ring': `${colors.accent.rose}33`,
    } as CSSProperties;

    useEffect(() => {
      if (isControlled) {
        setInternalValue(value ?? '');
      }
    }, [isControlled, value]);

    function setRefs(node: HTMLInputElement | null) {
      inputRef.current = node;

      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
        return;
      }

      if (forwardedRef) {
        forwardedRef.current = node;
      }
    }

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      if (!isControlled) {
        setInternalValue(event.target.value);
      }

      onChange?.(event);
    }

    function triggerSearch() {
      onSearch?.(currentValue);
      onSubmit?.(currentValue);
    }

    return (
      <div
        className={joinClassNames(
          styles.root,
          fullWidth && styles.fullWidth,
          backgroundVariant === 'transparent' && styles.transparent,
          disabled && styles.disabled,
          className,
        )}
        style={rootStyle}
      >
        <SearchInput
          {...restProps}
          ref={setRefs}
          id={id}
          name={name}
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoFocus={autoFocus}
          ariaLabel={ariaLabel}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              triggerSearch();
            }
          }}
        />
        <SearchIcon asButton={shouldUseIconButton} disabled={disabled} onClick={triggerSearch} />
      </div>
    );
  },
);

SearchBox.displayName = 'SearchBox';