import { forwardRef } from 'react';

import styles from './Button.module.css';













export const Button = forwardRef(
  (
  {
    variant = 'primary',
    size = 'medium',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    children,
    className = '',
    ...props
  },
  ref) =>
  {
    const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    isLoading ? styles.loading : '',
    className].

    filter(Boolean).
    join(' ');

    const spinnerStyle = {
      width: size === 'small' ? '14px' : size === 'large' ? '20px' : '16px',
      height: size === 'small' ? '14px' : size === 'large' ? '20px' : '16px'
    };

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={disabled || isLoading}
        {...props}>
        {isLoading ?
        <span className={styles.spinner} style={spinnerStyle} /> :

        <>
            {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
            {children && <span className={styles.label}>{children}</span>}
            {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
          </>
        }
      </button>);

  }
);

Button.displayName = 'Button';

export default Button;