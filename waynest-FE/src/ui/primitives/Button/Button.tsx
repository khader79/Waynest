import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
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
    ref,
  ) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : '',
      isLoading ? styles.loading : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const spinnerStyle: CSSProperties = {
      width: size === 'small' ? '14px' : size === 'large' ? '20px' : '16px',
      height: size === 'small' ? '14px' : size === 'large' ? '20px' : '16px',
    };

    return (
      <button
        ref={ref}
        className={classNames}
        disabled={disabled || isLoading}
        {...props}>
        {isLoading ? (
          <span className={styles.spinner} style={spinnerStyle} />
        ) : (
          <>
            {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
            {children && <span className={styles.label}>{children}</span>}
            {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
