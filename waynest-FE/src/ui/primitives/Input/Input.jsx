import { forwardRef } from 'react';
import styles from './Input.module.css';










export const Input = forwardRef(
  (
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    inputSize = 'medium',
    className = '',
    id,
    disabled,
    ...props
  },
  ref) =>
  {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const hasError = Boolean(error);

    const wrapperClasses = [
    styles.wrapper,
    hasError ? styles.hasError : '',
    disabled ? styles.disabled : '',
    className].

    filter(Boolean).
    join(' ');

    return (
      <div className={wrapperClasses}>
        {label &&
        <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        }
        <div className={styles.inputContainer}>
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`${styles.input} ${styles[inputSize]} ${leftIcon ? styles.hasLeftIcon : ''} ${rightIcon ? styles.hasRightIcon : ''}`}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props} />
          
          {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        </div>
        {error &&
        <span id={`${inputId}-error`} className={styles.error} role="alert">
            {error}
          </span>
        }
        {!error && helperText &&
        <span id={`${inputId}-helper`} className={styles.helperText}>
            {helperText}
          </span>
        }
      </div>);

  }
);

Input.displayName = 'Input';

export default Input;