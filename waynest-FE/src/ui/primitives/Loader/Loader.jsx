
import styles from './Loader.module.css';










const sizeMap = {
  small: { size: '20px', thickness: '2px' },
  medium: { size: '32px', thickness: '3px' },
  large: { size: '48px', thickness: '4px' }
};

export const Loader = ({
  size = 'medium',
  color,
  fullPage = false,
  text
}) => {
  const { size: spinnerSize, thickness } = sizeMap[size];

  const spinnerStyle = {
    width: spinnerSize,
    height: spinnerSize,
    borderWidth: thickness,
    borderColor: color ? `${color}30` : undefined,
    borderTopColor: color || undefined
  };

  if (fullPage) {
    return (
      <div className={styles.fullPage}>
        <div className={styles.spinner} style={spinnerStyle} />
        {text && <p className={styles.text}>{text}</p>}
      </div>);

  }

  return (
    <div className={styles.container}>
      <div className={styles.spinner} style={spinnerStyle} />
      {text && <p className={styles.text}>{text}</p>}
    </div>);

};

export default Loader;