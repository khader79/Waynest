import { useEffect, useState } from "react";

const OPTIONS = [
  { key: "photo", label: "صورة" },
  { key: "photo3", label: "صورة 3" },
  { key: "photo2", label: "صورة 2" },
  { key: "gradient", label: "تدرج" },
  { key: "pattern", label: "نمط" },
];

const STORAGE_KEY = "waynest-hero-bg";

export default function BackgroundSwitcher() {
  const [active, setActive] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "photo";
    } catch {
      return "photo";
    }
  });

  const [autoRotate, setAutoRotate] = useState(true);
  // keys that will be cycled automatically (only photo variants)
  const ROTATE_KEYS = ["photo", "photo2", "photo3"];
  const AUTO_ROTATE_INTERVAL_MS = 5000; // 5 seconds

  // keys that will be cycled automatically (only photo variants)
  const ROTATE_KEYS = ["photo", "photo2", "photo3"];
  const AUTO_ROTATE_INTERVAL_MS = 8000;

  useEffect(() => {
    applyActive(active);
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {
      /* ignore */
    }
  }, [active]);

  // Auto-rotate background images on an interval. Pauses when `autoRotate`
  // is false (user toggled off).
  useEffect(() => {
    if (!autoRotate) return undefined;

    const id = setInterval(() => {
      try {
        const currentIndex = ROTATE_KEYS.indexOf(active);
        const nextIndex = (currentIndex + 1) % ROTATE_KEYS.length;
        setActive(ROTATE_KEYS[nextIndex]);
      } catch {
        // ignore errors
      }
    }, AUTO_ROTATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [active, autoRotate]);

  function applyActive(key) {
    const el = document.querySelector(".lp-hero");
    if (!el) return;

    el.classList.remove(
      "bg-hero-photo",
      "bg-hero-photo-3",
      "bg-hero-gradient",
      "bg-hero-pattern",
      "bg-hero-photo-2",
    );

    if (key === "photo") el.classList.add("bg-hero-photo");
    else if (key === "photo2") el.classList.add("bg-hero-photo-2");
    else if (key === "photo3") el.classList.add("bg-hero-photo-3");
    else if (key === "gradient") el.classList.add("bg-hero-gradient");
    else if (key === "pattern") el.classList.add("bg-hero-pattern");
  }

  return (
    <div className="bg-switcher" role="toolbar" aria-label="خلفية الهيدر">
      <button
        type="button"
        className={"bg-switcher-control " + (autoRotate ? "running" : "paused")}
        aria-pressed={!autoRotate}
        onClick={() => setAutoRotate((v) => !v)}>
        {autoRotate ? "⏸" : "▶"}
      </button>

      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={"bg-switcher-btn " + (active === opt.key ? "active" : "")}
          onClick={() => setActive(opt.key)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
