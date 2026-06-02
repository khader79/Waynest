import { useState, useRef, useEffect } from "react";

const BLUR_DATA_URL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect width='800' height='600' fill='%23e2e8f0'/%3E%3C/svg%3E";

export default function LazyBackgroundImage({
  src,
  alt = "",
  className = "",
  fallbackColor = "#e2e8f0",
  rootMargin = "200px",
}) {
  const ref = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const showImage = inView && src && !failed;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={alt}
      className={`lazy-bg ${className} ${loaded ? "lazy-bg--loaded" : "lazy-bg--loading"}`}
      style={{ backgroundColor: fallbackColor }}
    >
      {showImage && (
        <img
          src={src}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s ease-in-out",
          }}
        />
      )}

      {(!showImage || !loaded) && (
        <div
          className="lazy-bg__placeholder"
          style={{
            position: "absolute",
            inset: 0,
            background:
              !failed && showImage
                ? `linear-gradient(135deg, ${fallbackColor}, ${adjustColor(fallbackColor, -20)})`
                : `linear-gradient(135deg, ${fallbackColor}, ${adjustColor(fallbackColor, -30)})`,
            opacity: loaded ? 0 : 1,
            transition: "opacity 0.5s ease-in-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: "rgba(255,255,255,0.3)",
              width: 32,
              height: 32,
            }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
      )}
    </div>
  );
}

function adjustColor(hex, amount) {
  if (!hex || !/^#([0-9a-f]{3}){1,2}$/i.test(hex)) return hex;
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(color, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
