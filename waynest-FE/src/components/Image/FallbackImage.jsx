import React, { useState } from "react";
import { FiImage } from "react-icons/fi";

export default function FallbackImage({
  src,
  alt,
  className = "",
  fallbackLabel = "Photo unavailable",
  fallbackTitle = null,
  fallbackSubtitle = null,
  onErrorFallback,
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${className} fallback-image`}
        role="img"
        aria-label={alt ?? fallbackLabel}>
        <div className="fallback-image__inner">
          <FiImage size={28} aria-hidden />
          {fallbackTitle ? (
            <div className="fallback-image__title">{fallbackTitle}</div>
          ) : null}
          {fallbackSubtitle ? (
            <div className="fallback-image__subtitle">{fallbackSubtitle}</div>
          ) : (
            !fallbackTitle && (
              <div className="fallback-image__label">{fallbackLabel}</div>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/img-redundant-alt
    <img
      src={src}
      alt={alt ?? "image"}
      className={className}
      onError={(e) => {
        setFailed(true);
        if (typeof onErrorFallback === "function") onErrorFallback(e);
      }}
    />
  );
}
