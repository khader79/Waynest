import { useState, useEffect, useCallback } from "react";
import { fetchPlaceGallery } from "@/api/placeImages";
import styles from "./PlaceImageGallery.module.css";

const SOURCE_LABELS = {
  google_places: "Google",
  foursquare:    "Foursquare",
  wikipedia:     "Wikipedia",
  wikimedia:     "Wikimedia",
  unsplash:      "Unsplash",
};

const FALLBACK_BY_TYPE = {
  RESTAURANT: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=75&auto=format&fit=crop",
  CAFE:       "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=75&auto=format&fit=crop",
  MUSEUM:     "https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=800&q=75&auto=format&fit=crop",
  PARK:       "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=75&auto=format&fit=crop",
  HOTEL:      "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=75&auto=format&fit=crop",
  BEACH:      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=75&auto=format&fit=crop",
  LANDMARK:   "https://images.unsplash.com/photo-1493515322954-4fa727e97985?w=800&q=75&auto=format&fit=crop",
  ACTIVITY:   "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=75&auto=format&fit=crop",
  DEFAULT:    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=75&auto=format&fit=crop",
};

function getFallback(type) {
  return FALLBACK_BY_TYPE[String(type ?? "").toUpperCase()] ?? FALLBACK_BY_TYPE.DEFAULT;
}

// ── Single image with error fallback ─────────────────────────────────────────
function GalleryImage({ src, alt, className, type, onClick }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`${styles.imgWrap} ${className ?? ""} ${loaded ? styles.imgLoaded : ""}`}
         onClick={onClick} role={onClick ? "button" : undefined}
         tabIndex={onClick ? 0 : undefined}
         onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}>
      <img
        src={failed ? getFallback(type) : src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => { setFailed(true); setLoaded(true); }}
      />
      {!loaded && <div className={styles.imgSkeleton} />}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ images, index, onClose, onNav }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onNav]);

  const img = images[index];
  if (!img) return null;

  return (
    <div className={styles.lightboxOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.lightbox}>
        <button className={styles.lbClose} onClick={onClose} aria-label="Close">✕</button>
        {images.length > 1 && (
          <>
            <button className={`${styles.lbNav} ${styles.lbPrev}`} onClick={() => onNav(-1)} aria-label="Previous">‹</button>
            <button className={`${styles.lbNav} ${styles.lbNext}`} onClick={() => onNav(1)} aria-label="Next">›</button>
          </>
        )}
        <img src={img.url} alt={img.attribution ?? "Place photo"} className={styles.lbImage} />
        {img.attribution && (
          <div className={styles.lbAttribution}>{img.attribution}</div>
        )}
        <div className={styles.lbDots}>
          {images.map((_, i) => (
            <span key={i} className={`${styles.lbDot} ${i === index ? styles.lbDotActive : ""}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Gallery Component ────────────────────────────────────────────────────
/**
 * Props:
 *   placeName   {string}   required — place name sent to the image API
 *   city        {string}   optional — city name improves search accuracy
 *   type        {string}   optional — RESTAURANT, MUSEUM, LANDMARK, etc.
 *   lat         {number}   optional — latitude for nearbysearch (MOST ACCURATE)
 *   lng         {number}   optional — longitude
 *   staticImage {string}   optional — show this URL immediately, still fetch gallery
 *   maxImages   {number}   default 5
 *   compact     {boolean}  show hero only, no thumbnails, no lightbox
 *   className   {string}
 */
export default function PlaceImageGallery({
  placeName,
  city,
  type,
  lat,
  lng,
  staticImage,
  maxImages = 5,
  compact = false,
  className = "",
}) {
  // Start with staticImage so users see something immediately (no blank state)
  const [gallery, setGallery] = useState(
    staticImage
      ? { images: [{ url: staticImage, source: "static", isGeneric: false }], topSource: null }
      : null,
  );
  const [loading, setLoading] = useState(!staticImage);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    if (!placeName) { setLoading(false); return; }

    // ── compact mode: NEVER call the API — use staticImage or type fallback only ──
    // This prevents N+1 API calls on list pages (Explore, search results, etc.)
    if (compact) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    if (!staticImage) setLoading(true);

    fetchPlaceGallery(placeName, city, type, maxImages, lat, lng)
      .then((data) => {
        if (cancelled) return;
        if (data?.images?.length > 0) {
          setGallery(data);
        } else if (!staticImage) {
          setGallery({ images: [], topSource: null });
        }
      })
      .catch(() => {
        if (!cancelled && !staticImage) {
          setGallery({ images: [], topSource: null });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeName, city, type, maxImages, lat, lng, compact]);

  const images = gallery?.images ?? [];
  const hero   = images[0] ?? null;
  const thumbs = images.slice(1);

  const handleNav = useCallback(
    (dir) =>
      setLightboxIdx((prev) => {
        if (prev === null) return null;
        return (prev + dir + images.length) % images.length;
      }),
    [images.length],
  );

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`${styles.gallery} ${className}`}>
        <div className={`${styles.hero} ${styles.heroSkeleton}`} />
        {!compact && (
          <div className={styles.thumbRow}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`${styles.thumb} ${styles.heroSkeleton}`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── No images → type-appropriate fallback ────────────────────────────────
  if (!hero) {
    return (
      <div className={`${styles.gallery} ${className}`}>
        <GalleryImage src={getFallback(type)} alt={placeName} className={styles.hero} type={type} />
      </div>
    );
  }

  return (
    <>
      <div className={`${styles.gallery} ${className}`}>
        {/* Hero image — no lightbox in compact mode */}
        <GalleryImage
          src={hero.url}
          alt={placeName}
          className={styles.hero}
          type={type}
          onClick={!compact ? () => setLightboxIdx(0) : undefined}
        />

        {/* Source badge */}
        {gallery?.topSource && (
          <div className={styles.sourceBadge}>
            {SOURCE_LABELS[gallery.topSource] ?? gallery.topSource}
          </div>
        )}

        {/* Thumbnail strip */}
        {!compact && thumbs.length > 0 && (
          <div className={styles.thumbRow}>
            {thumbs.map((img, i) => (
              <GalleryImage
                key={i}
                src={img.url}
                alt={`${placeName} ${i + 2}`}
                className={styles.thumb}
                type={type}
                onClick={() => setLightboxIdx(i + 1)}
              />
            ))}
          </div>
        )}

        {/* All photos button */}
        {images.length > 1 && (
          <button
            className={styles.allPhotosBtn}
            onClick={() => setLightboxIdx(0)}
            type="button">
            📷 {images.length} photos
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onNav={handleNav}
        />
      )}
    </>
  );
}
