import { type HTMLAttributes, type ReactNode } from 'react';
import styles from './Card.module.css';

export type CardElevation = 'none' | 'soft' | 'default' | 'raised';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  hoverable?: boolean;
  padding?: 'none' | 'small' | 'medium' | 'large';
  children: ReactNode;
}

export const Card = ({
  elevation = 'default',
  hoverable = false,
  padding = 'medium',
  children,
  className = '',
  ...props
}: CardProps) => {
  const classNames = [
    styles.card,
    styles[`elevation-${elevation}`],
    hoverable ? styles.hoverable : '',
    styles[`padding-${padding}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
};

export default Card;
