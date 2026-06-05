import { useState, useEffect, useRef } from "react";
import { fetchTripMapData, fetchTripMapDataByIds } from "@/api/trips";
import styles from "./TripMapModal.module.css";

const SLOT_META = {
  morning:   { color: "#f59e0b", label: "Morning",   emoji: "🌅" },
  afternoon: { color: "#10b981", label: "Afternoon",  emoji: "☀️" },
  evening:   { color: "#6366f1", label: "Evening",    emoji: "🌙" },
};

const TYPE_EMOJI = {
  LANDMARK:"🏛️",MUSEUM:"🏛️",RESTAURANT:"🍽️",CAFE:"☕",PARK:"🌿",
  BEACH:"🏖️",HOTEL:"🏨",ACTIVITY:"🎯",TOUR:"🗺️",MARKET:"🛍️",
  SHOPPING:"🛍️",ENTERTAINMENT:"🎭",SPA:"💆",NATURE:"🌲",VIEWPOINT:"🔭",
};

function buildMapHtml(markers, cityCenter) {
  const center = cityCenter?.lat
    ? [cityCenter.lat, cityCenter.lng]
    : [31.7044, 35.2076];

  const markersJs = JSON.stringify(markers.map(m => ({
    lat:       m.lat,
    lng:       m.lng,
    label:     `${m.dayNumber}${(m.slot||'')[0]?.toUpperCase()||''}`,
    color:     SLOT_META[m.slot]?.color ?? "#6366f1",
    name:      m.name,
    type:      m.type,
    slot:      m.slot,
    day:       m.dayNumber,
    cost:      m.estimatedCost,
    duration:  m.duration,
    address:   m.address,
    imageUrl:  m.imageUrl ?? null,
  })));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body,#map{width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}

  /* ── Popup shell ── */
  .custom-popup .leaflet-popup-content-wrapper{
    border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.18);
    padding:0;overflow:hidden;min-width:240px;
  }
  .custom-popup .leaflet-popup-content{margin:0}
  .custom-popup .leaflet-popup-tip-container{margin-top:-1px}

  /* ── Photo banner ── */
  .popup-photo{
    width:100%;height:140px;overflow:hidden;position:relative;
    background:linear-gradient(135deg,#e2e8f0,#cbd5e1);
  }
  .popup-photo img{
    width:100%;height:100%;object-fit:cover;
    transition:transform .3s ease;
  }
  .popup-photo img:hover{transform:scale(1.04)}
  .popup-photo-placeholder{
    width:100%;height:100%;display:flex;align-items:center;
    justify-content:center;font-size:36px;
    background:linear-gradient(135deg,#f1f5f9,#e2e8f0);
  }
  .popup-slot-badge{
    position:absolute;top:8px;right:8px;
    padding:3px 10px;border-radius:99px;font-size:11px;
    font-weight:700;color:#fff;backdrop-filter:blur(6px);
    background:rgba(0,0,0,.45);letter-spacing:.3px;
  }

  /* ── Body ── */
  .popup-body{padding:12px 14px 10px}
  .popup-name{font-weight:700;font-size:14px;color:#111;margin-bottom:3px;line-height:1.3}
  .popup-meta{font-size:12px;color:#6b7280;margin-bottom:8px;line-height:1.4}
  .popup-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
  .pill{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600}
  .pill-cost{background:#f0fdf4;color:#166534}
  .pill-dur{background:#f8fafc;color:#475569;border:1px solid #e2e8f0}

  /* ── Nav buttons ── */
  .popup-links{display:flex;gap:6px}
  .popup-links a{
    flex:1;text-align:center;padding:6px 4px;
    border-radius:8px;text-decoration:none;font-size:11px;font-weight:700;
    letter-spacing:.2px;transition:opacity .15s;
  }
  .popup-links a:hover{opacity:.85}
  .link-gmaps{background:#4285f4;color:#fff}
  .link-waze{background:#00b7eb;color:#fff}

  /* ── Day separator line ── */
  .leaflet-polyline{stroke-dasharray:8 5}

  /* ── Cluster count badge ── */
  .marker-cluster div{background:rgba(255,255,255,.85);border-radius:50%}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const MARKERS = ${markersJs};
const CENTER  = [${center[0]}, ${center[1]}];

const map = L.map('map', { zoomControl: true, attributionControl: true });

// CartoDB Positron — clean light tiles, Google-Maps-like feel
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20,
}).addTo(map);

/* ── Custom SVG pin ── */
function svgPin(color, text) {
  return \`<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48">
    <filter id="sh" x="-30%" y="-20%" width="160%" height="160%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
    <ellipse cx="19" cy="44" rx="6" ry="3" fill="rgba(0,0,0,0.18)"/>
    <path d="M19 2C11.3 2 5 8.3 5 16c0 9 14 30 14 30S33 25 33 16C33 8.3 26.7 2 19 2z"
      fill="\${color}" stroke="#fff" stroke-width="2.5" filter="url(#sh)"/>
    <text x="19" y="19" text-anchor="middle" dominant-baseline="central"
      font-family="-apple-system,sans-serif" font-size="\${text.length>2?9:11}"
      font-weight="800" fill="#fff">\${text}</text>
  </svg>\`;
}

const TYPE_EMOJI = {
  LANDMARK:"🏛️",MUSEUM:"🏛️",RESTAURANT:"🍽️",CAFE:"☕",PARK:"🌿",
  BEACH:"🏖️",HOTEL:"🏨",ACTIVITY:"🎯",TOUR:"🗺️",MARKET:"🛍️",
  SHOPPING:"🛍️",ENTERTAINMENT:"🎭",SPA:"💆",NATURE:"🌲",VIEWPOINT:"🔭",
};

function slotLabel(slot) {
  return {morning:'🌅 Morning',afternoon:'☀️ Afternoon',evening:'🌙 Evening'}[slot]||slot;
}

if (!MARKERS.length) {
  map.setView(CENTER, 14);
} else {
  const bounds = [];

  /* ── Day route lines ── */
  const byDay = {};
  MARKERS.forEach(m => {
    if (!byDay[m.day]) byDay[m.day] = [];
    byDay[m.day].push(m);
  });
  Object.values(byDay).forEach(dm => {
    const sorted = dm.sort((a,b)=>['morning','afternoon','evening'].indexOf(a.slot)-['morning','afternoon','evening'].indexOf(b.slot));
    if (sorted.length > 1) {
      L.polyline(sorted.map(m=>[m.lat,m.lng]), {
        color: '#94a3b8', weight: 2.5, dashArray: '8 5', opacity: 0.65
      }).addTo(map);
    }
  });

  /* ── Markers ── */
  MARKERS.forEach(m => {
    bounds.push([m.lat, m.lng]);
    const icon = L.divIcon({
      html: svgPin(m.color, m.label),
      className: '', iconSize: [38,48], iconAnchor: [19,48], popupAnchor: [0,-50]
    });

    const gm = 'https://www.google.com/maps/search/?api=1&query=' + m.lat + ',' + m.lng;
    const wz = 'https://waze.com/ul?ll=' + m.lat + ',' + m.lng + '&navigate=yes';
    const emoji = TYPE_EMOJI[m.type] || '📍';

    /* Build image section */
    let photoHtml = '';
    if (m.imageUrl) {
      photoHtml = \`<div class="popup-photo">
        <img src="\${m.imageUrl}" alt="\${m.name}" loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=popup-photo-placeholder>\${emoji}</div>'"/>
        <span class="popup-slot-badge">\${slotLabel(m.slot)}</span>
      </div>\`;
    } else {
      photoHtml = \`<div class="popup-photo">
        <div class="popup-photo-placeholder">\${emoji}</div>
        <span class="popup-slot-badge">\${slotLabel(m.slot)}</span>
      </div>\`;
    }

    const popup = L.popup({ maxWidth: 270, className: 'custom-popup' }).setContent(\`
      \${photoHtml}
      <div class="popup-body">
        <div class="popup-name">\${m.name}</div>
        <div class="popup-meta">
          \${m.type ? m.type + ' · ' : ''}Day \${m.day}\${m.address ? '<br>📍 ' + m.address : ''}
        </div>
        <div class="popup-pills">
          <span class="pill pill-cost">\${m.cost > 0 ? '💰 ' + m.cost + ' ILS' : '🆓 Free'}</span>
          \${m.duration ? '<span class="pill pill-dur">⏱ ' + m.duration + '</span>' : ''}
        </div>
        <div class="popup-links">
          <a class="link-gmaps" href="\${gm}" target="_blank">🗺 Google Maps</a>
          <a class="link-waze" href="\${wz}" target="_blank">🚗 Waze</a>
        </div>
      </div>
    \`);

    L.marker([m.lat, m.lng], { icon }).addTo(map).bindPopup(popup);
  });

  map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
}
</script>
</body>
</html>`;
}

export default function TripMapModal({ tripPlanId, tripPlan, onClose }) {
  const [mapData,   setMapData]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (tripPlanId) {
      fetchTripMapData(tripPlanId)
        .then(d => setMapData(d))
        .catch(e => setError(e?.response?.data?.message ?? e?.message ?? "Failed to load map"))
        .finally(() => setLoading(false));
      return;
    }
    if (tripPlan?.days?.length) {
      const placeIds = [];
      const slotMeta = { morning: 0, afternoon: 1, evening: 2 };
      for (const day of tripPlan.days)
        for (const [slot] of Object.entries(slotMeta))
          if (day[slot]?.placeId && !placeIds.includes(day[slot].placeId))
            placeIds.push(day[slot].placeId);

      if (!placeIds.length) { setLoading(false); setError("No places to show."); return; }

      fetchTripMapDataByIds(placeIds, tripPlan.cityId)
        .then(coordData => {
          const coordsById = new Map(coordData.markers.map(m => [m.placeId, m]));
          const enriched = [];
          for (const day of tripPlan.days)
            for (const [slot, slotIdx] of Object.entries(slotMeta)) {
              const s = day[slot];
              if (!s?.placeId) continue;
              const c = coordsById.get(s.placeId);
              if (!c) continue;
              enriched.push({
                ...c,
                dayNumber:     day.day,
                slot,
                slotIndex:     slotIdx,
                estimatedCost: s.estimatedCost ?? 0,
                duration:      s.duration ?? "",
                color:         SLOT_META[slot]?.color ?? "#6366f1",
                name:          s.name ?? c.name,
                type:          s.type ?? c.type,
                imageUrl:      s.imageUrl ?? c.imageUrl ?? null,
              });
            }
          setMapData({ cityCenter: coordData.cityCenter, markers: enriched });
        })
        .catch(e => setError(e?.response?.data?.message ?? e?.message ?? "Failed to load map"))
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false); setError("No places in this plan.");
  }, [tripPlanId, tripPlan]);

  const [iframeSrc, setIframeSrc] = useState("");
  useEffect(() => {
    if (!mapData?.markers) return;
    const filtered = activeDay === 0
      ? mapData.markers
      : mapData.markers.filter(m => m.dayNumber === activeDay);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const html = buildMapHtml(filtered, mapData.cityCenter);
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    setIframeSrc(url);
  }, [mapData, activeDay]);

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const days = mapData?.markers
    ? [...new Set(mapData.markers.map(m => m.dayNumber))].sort((a, b) => a - b)
    : [];

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>🗺 Trip Map</h2>
            {mapData?.cityCenter?.name && (
              <p className={styles.subtitle}>{mapData.cityCenter.name}</p>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          {Object.entries(SLOT_META).map(([slot, meta]) => (
            <span key={slot} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: meta.color }} />
              {meta.emoji} {meta.label}
            </span>
          ))}
        </div>

        {/* Day filter pills */}
        {days.length > 1 && (
          <div className={styles.dayPills}>
            <button
              className={`${styles.dayPill} ${activeDay === 0 ? styles.dayPillActive : ""}`}
              onClick={() => setActiveDay(0)}>
              All Days
            </button>
            {days.map(d => (
              <button
                key={d}
                className={`${styles.dayPill} ${activeDay === d ? styles.dayPillActive : ""}`}
                onClick={() => setActiveDay(d)}>
                Day {d}
              </button>
            ))}
          </div>
        )}

        {/* Map iframe */}
        <div className={styles.mapWrap}>
          {loading && (
            <div className={styles.state}>
              <span className={styles.spinner} /> Loading map…
            </div>
          )}
          {error && !loading && (
            <div className={styles.stateError}>
              <span style={{ fontSize: 32 }}>⚠️</span>
              <p>{error}</p>
            </div>
          )}
          {!loading && !error && iframeSrc && (
            <iframe
              src={iframeSrc}
              className={styles.map}
              title="Trip Map"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          )}
        </div>

        {/* Place list below map */}
        {!loading && !error && mapData?.markers?.length > 0 && (
          <div className={styles.markerList}>
            {(activeDay === 0
              ? mapData.markers
              : mapData.markers.filter(m => m.dayNumber === activeDay)
            ).map(m => {
              const meta  = SLOT_META[m.slot] ?? SLOT_META.morning;
              const emoji = TYPE_EMOJI[m.type] ?? "📍";
              return (
                <div key={`${m.placeId}-${m.dayNumber}-${m.slot}`} className={styles.markerRow}>
                  {/* Thumbnail */}
                  <div className={styles.markerThumb}>
                    {m.imageUrl
                      ? <img src={m.imageUrl} alt={m.name} loading="lazy"
                             onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
                             style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} />
                      : null}
                    <div style={{ display: m.imageUrl ? "none" : "flex", width: "100%", height: "100%",
                                  alignItems: "center", justifyContent: "center",
                                  background: meta.color + "22", borderRadius: 8, fontSize: 18 }}>
                      {emoji}
                    </div>
                  </div>

                  <div className={styles.markerInfo}>
                    <span className={styles.markerName}>{emoji} {m.name}</span>
                    <span className={styles.markerMeta}>
                      {meta.emoji} {meta.label} · Day {m.dayNumber}
                      {m.estimatedCost > 0 ? ` · ${m.estimatedCost} ILS` : " · Free"}
                    </span>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                    target="_blank" rel="noreferrer"
                    className={styles.markerLink}>
                    Open
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
