import type { CSSProperties } from 'react';
import styles from './Loader.module.css';

export type LoaderSize = 'small' | 'medium' | 'large';

export interface LoaderProps {
  size?: LoaderSize;
  color?: string;
  fullPage?: boolean;
  text?: string;
}

const sizeMap: Record<LoaderSize, { size: string; thickness: string }> = {
  small: { size: '20px', thickness: '2px' },
  medium: { size: '32px', thickness: '3px' },
  large: { size: '48px', thickness: '4px' },
};

export const Loader = ({
  size = 'medium',
  color,
  fullPage = false,
  text,
}: LoaderProps) => {
  const { size: spinnerSize, thickness } = sizeMap[size];

  const spinnerStyle: CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    borderWidth: thickness,
    borderColor: color ? `${color}30` : undefined,
    borderTopColor: color || undefined,
  };

  if (fullPage) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.spinner} style={spinnerStyle} />
        {text && <p className={styles.text}>{text}</p>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.spinner} style={spinnerStyle} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
};

export default Loader;
