import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import { colors } from '../../styles/tokens/colors';
import { inputFieldFoundation } from './inputFieldFoundation';
import styles from './InputField.module.css';

export type InputFieldVariant =
  | 'default'
  | 'defaultWithValue'
  | 'focused'
  | 'disabled'
  | 'error'
  | 'success'
  | 'outlined'
  | 'bare';

export type InputFieldMessageType = 'helper' | 'error' | 'success';

type NativeInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'size' | 'value' | 'defaultValue' | 'onChange'
>;

export type InputFieldProps = NativeInputProps & {
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  variant: InputFieldVariant;
  message?: string;
  messageType?: InputFieldMessageType;
  showClearButton?: boolean;
  onClear?: () => void;
  className?: string;
  describedBy?: string;
  hideLabel?: boolean;
  fullWidth?: boolean;
};

type InputLabelProps = {
  htmlFor: string;
  label: string;
  hideLabel?: boolean;
};

type InputMessageProps = {
  id?: string;
  message?: string;
  type: InputFieldMessageType;
};

type InputClearButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

type InputControlProps = {
  variant: InputFieldVariant;
  disabled?: boolean;
  hasClearButton: boolean;
  children: ReactNode;
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function resolveMessageType(
  variant: InputFieldVariant,
  messageType?: InputFieldMessageType,
): InputFieldMessageType {
  if (variant === 'error') {
    return 'error';
  }

  if (variant === 'success') {
    return 'success';
  }

  return messageType ?? 'helper';
}

function resolveInputMode(variant: InputFieldVariant) {
  if (variant === 'outlined') {
    return styles.outlined;
  }

  if (variant === 'bare') {
    return styles.minimal;
  }

  return styles.underline;
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 4 12 12M12 4 4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InputLabel({ htmlFor, label, hideLabel = false }: InputLabelProps) {
  return (
    <label htmlFor={htmlFor} className={joinClassNames(styles.label, hideLabel && styles.hiddenLabel)}>
      {label}
    </label>
  );
}

export function InputMessage({ id, message, type }: InputMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      className={joinClassNames(
        styles.message,
        type === 'error' && styles.messageError,
        type === 'success' && styles.messageSuccess,
      )}
    >
      {message}
    </p>
  );
}

export function InputClearButton({ onClick, disabled }: InputClearButtonProps) {
  return (
    <button
      type="button"
      className={styles.clearButton}
      onClick={onClick}
      aria-label="입력값 지우기"
      disabled={disabled}
    >
      <span className={styles.clearButtonIcon}>
        <ClearIcon />
      </span>
    </button>
  );
}

export function InputControl({ variant, disabled, hasClearButton, children }: InputControlProps) {
  return (
    <div
      className={joinClassNames(
        styles.control,
        resolveInputMode(variant),
        variant === 'focused' && styles.focused,
        disabled && styles.disabled,
        variant === 'error' && styles.error,
        variant === 'success' && styles.success,
        hasClearButton && styles.withClear,
      )}
    >
      {children}
    </div>
  );
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  {
    label,
    value,
    defaultValue,
    onChange,
    placeholder,
    variant,
    message,
    messageType,
    showClearButton,
    onClear,
    className,
    id,
    name,
    type = 'text',
    disabled,
    readOnly,
    required,
    autoComplete,
    maxLength,
    describedBy,
    hideLabel = false,
    fullWidth = true,
    ...restProps
  },
  forwardedRef,
) {
  const generatedId = useId();
  const inputId = id ?? `input-field-${generatedId}`;
  const helperId = `${inputId}-message`;
  const isControlled = value !== undefined;
  const isDisabled = disabled || variant === 'disabled';
  const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  function handleClear() {
    if (!isControlled) {
      setInternalValue('');
    }

    onClear?.();
    inputRef.current?.focus();
  }

  const currentValue = isControlled ? value ?? '' : internalValue;
  const resolvedMessageType = resolveMessageType(variant, messageType);
  const shouldShowClearButton =
    Boolean(showClearButton) && currentValue.length > 0 && !isDisabled && !readOnly;
  const resolvedDescribedBy = [describedBy, message ? helperId : undefined].filter(Boolean).join(' ') || undefined;
  const inputStyle = {
    '--input-label': colors.text.primary,
    '--input-text': colors.text.primary,
    '--input-placeholder': colors.text.primaryAlpha40,
    '--input-border': colors.accent.navy,
    '--input-border-active': colors.accent.navyHover,
    '--input-clear-background': colors.accent.navy,
    '--input-clear-icon': colors.surface.elevated,
    '--input-disabled-border': colors.border.strong,
    '--input-disabled-background': colors.border.default,
    '--input-message-error': colors.semantic.error,
    '--input-message-success': colors.semantic.success,
    '--input-focus-ring': `${colors.accent.navy}33`,
  } as CSSProperties;

  return (
    <div className={joinClassNames(styles.root, fullWidth && styles.fullWidth, className)} style={inputStyle}>
      {variant !== 'bare' ? <InputLabel htmlFor={inputId} label={label} hideLabel={hideLabel} /> : null}
      {variant === 'bare' && !hideLabel ? <InputLabel htmlFor={inputId} label={label} hideLabel={hideLabel} /> : null}
      <InputControl variant={variant} disabled={isDisabled} hasClearButton={shouldShowClearButton}>
        <input
          {...restProps}
          ref={setRefs}
          id={inputId}
          name={name}
          type={type}
          className={styles.input}
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={isDisabled}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-describedby={resolvedDescribedBy}
          aria-invalid={resolvedMessageType === 'error' ? true : undefined}
        />
        {shouldShowClearButton ? <InputClearButton onClick={handleClear} disabled={isDisabled} /> : null}
      </InputControl>
      <InputMessage id={message ? helperId : undefined} message={message} type={resolvedMessageType} />
    </div>
  );
});

InputField.displayName = 'InputField';

export function getInputFieldMockProps() {
  return {
    label: '아이디',
    placeholder: '아이디 입력',
    onClear: () => undefined,
  } as const;
}