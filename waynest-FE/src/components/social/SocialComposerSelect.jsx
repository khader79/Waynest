import { useEffect, useRef, useState } from "react";

/** Themed dropdown for plan + visibility in composer */
export function SocialComposerSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "—",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div className="social-composer-select" ref={rootRef} id={id}>
      {label ? (
        <span
          className="social-composer-footer__label"
          id={id ? `${id}-label` : undefined}
        >
          {label}
        </span>
      ) : null}
      <button
        type="button"
        className={`social-composer-select__trigger${open ? " is-open" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id ? `${id}-label` : undefined}
      >
        <span className="social-composer-select__value">
          {current?.label ?? placeholder}
        </span>
        <span className="social-composer-select__chev" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul className="social-composer-select__menu" role="listbox">
          {options.map((o) => (
            <li key={String(o.value)} role="none">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`social-composer-select__option${o.value === value ? " is-active" : ""}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
