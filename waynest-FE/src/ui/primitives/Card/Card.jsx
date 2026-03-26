import 'react';
import styles from './Card.module.css';










export const Card = ({
  elevation = 'default',
  hoverable = false,
  padding = 'medium',
  children,
  className = '',
  ...props
}) => {
  const classNames = [
  styles.card,
  styles[`elevation-${elevation}`],
  hoverable ? styles.hoverable : '',
  styles[`padding-${padding}`],
  className].

  filter(Boolean).
  join(' ');

  return (
    <div className={classNames} {...props}>
      {children}
    </div>);

};

export default Card;