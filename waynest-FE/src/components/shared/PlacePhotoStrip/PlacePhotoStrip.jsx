import { useState, useEffect } from "react";
import { fetchPrimaryImage } from "@/api/placeImages";
import styles from "./PlacePhotoStrip.module.css";

const TYPE_ICONS = {
  RESTAURANT:"🍽️", CAFE:"☕", MUSEUM:"🏛️", PARK:"🌿", BEACH:"🏖️",
  HOTEL:"🏨", LANDMARK:"🏛️", ACTIVITY:"🎯", TOUR:"🗺️", SHOP:"🛍️",
  CHURCH:"⛪", MOSQUE:"🕌",
};
const TYPE_GRADIENT = {
  RESTAURANT:"135deg,#7c3aed,#4c1d95", CAFE:"135deg,#92400e,#451a03",
  MUSEUM:"135deg,#1d4ed8,#1e3a5f",     PARK:"135deg,#166534,#052e16",
  BEACH:"135deg,#0369a1,#0c4a6e",      HOTEL:"135deg,#0f766e,#042f2e",
  LANDMARK:"135deg,#b45309,#451a03",   DEFAULT:"135deg,#374151,#111827",
};

function gradient(type) {
  return `linear-gradient(${TYPE_GRADIENT[String(type ?? "").toUpperCase()] ?? TYPE_GRADIENT.DEFAULT})`;
}

function Placeholder({ name, type }) {
  const icon = TYPE_ICONS[String(type ?? "").toUpperCase()] ?? "📍";
  return (
    <div className={styles.placeholder} style={{ background: gradient(type) }}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.label}>{name}</span>
    </div>
  );
}

export default function PlacePhotoStrip({
  placeName,
  city,
  type,
  lat,
  lng,
  imageUrl,      // stored DB url — show immediately
  className = "",
}) {
  const [src,    setSrc]    = useState(imageUrl ?? null);
  const [status, setStatus] = useState(imageUrl ? "ready" : "loading");

  useEffect(() => {
    // If DB already has a url, use it and stop
    if (imageUrl) {
      setSrc(imageUrl);
      setStatus("ready");
      return;
    }

    if (!placeName) { setStatus("empty"); return; }

    let cancelled = false;

    // No DB image → ask the API (Google Places has the key now)
    fetchPrimaryImage(placeName, city, type)
      .then((url) => {
        if (cancelled) return;
        if (url) { setSrc(url); setStatus("ready"); }
        else        setStatus("empty");
      })
      .catch(() => { if (!cancelled) setStatus("empty"); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeName, city, type, imageUrl]);

  // ── Skeleton while loading ─────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className={`${styles.strip} ${className}`}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  if (src && status === "ready") {
    return (
      <div className={`${styles.strip} ${className}`}>
        <img
          src={src}
          alt={placeName}
          loading="eager"
          className={styles.img}
          onError={() => { setSrc(null); setStatus("empty"); }}
        />
      </div>
    );
  }

  // ── No image → clean gradient placeholder ────────────────────────────────
  return (
    <div className={`${styles.strip} ${className}`}>
      <Placeholder name={placeName} type={type} />
    </div>
  );
}
