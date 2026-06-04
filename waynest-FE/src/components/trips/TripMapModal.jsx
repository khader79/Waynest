/**
 * TripMapModal — Leaflet map via CDN iframe (zero Vite bundling issues).
 *
 * Leaflet is loaded from unpkg CDN inside a Blob iframe so Vite never
 * needs to pre-bundle it. The parent page stays clean.
 */

import { useState, useEffect, useRef } from "react";
import { fetchTripMapData, fetchTripMapDataByIds } from "@/api/trips";
import styles from "./TripMapModal.module.css";

const SLOT_META = {
  morning:   { color: "#1E6B4A", label: "Morning",   emoji: "🌅" },
  afternoon: { color: "#2C5F8A", label: "Afternoon",  emoji: "☀️" },
  evening:   { color: "#0F3D2E", label: "Evening",    emoji: "🌙" },
};

const TYPE_EMOJI = {
  LANDMARK:"🏛️",MUSEUM:"🏛️",RESTAURANT:"🍽️",CAFE:"☕",PARK:"🌿",
  BEACH:"🏖️",HOTEL:"🏨",ACTIVITY:"🎯",TOUR:"🗺️",MARKET:"🛍️",
};

function buildMapHtml(markers, cityCenter) {
  const center = cityCenter?.lat
    ? [cityCenter.lat, cityCenter.lng]
    : [31.7044, 35.2076];

  const markersJs = JSON.stringify(markers.map(m => ({
    lat: m.lat, lng: m.lng,
    label: `${m.dayNumber}${(m.slot||'')[0]?.toUpperCase()||''}`,
    color: SLOT_META[m.slot]?.color ?? "#0F3D2E",
    name: m.name,
    type: m.type,
    slot: m.slot,
    day: m.dayNumber,
    cost: m.estimatedCost,
    duration: m.duration,
    address: m.address,
  })));

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; }
  .custom-popup .leaflet-popup-content-wrapper { border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.18); padding:0; }
  .custom-popup .leaflet-popup-content { margin:12px 14px; font-family:system-ui,sans-serif; }
  .popup-name { font-weight:700; font-size:14px; margin-bottom:4px; }
  .popup-meta { font-size:12px; color:#6b7280; margin-bottom:8px; }
  .popup-pills { display:flex; gap:6px; flex-wrap:wrap; }
  .pill { padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
  .pill-cost { background:#f0fdf4; color:#166534; }
  .pill-dur { background:#f8fafc; color:#475569; }
  .popup-links { display:flex; gap:6px; margin-top:8px; }
  .popup-links a { flex:1; text-align:center; padding:5px; background:#1E6B4A; color:#fff; border-radius:8px; text-decoration:none; font-size:11px; font-weight:600; }
  .popup-links a.waze { background:#2C5F8A; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const MARKERS = ${markersJs};
const CENTER = [${center[0]}, ${center[1]}];

const map = L.map('map', { zoomControl: true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  maxZoom: 19
}).addTo(map);

function svgPin(color, text) {
  return \`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
    <ellipse cx="18" cy="41" rx="6" ry="3" fill="rgba(0,0,0,0.18)"/>
    <path d="M18 2C10.8 2 5 7.8 5 15c0 8 13 27 13 27S31 23 31 15C31 7.8 25.2 2 18 2z"
      fill="\${color}" stroke="#fff" stroke-width="2"/>
    <text x="18" y="18" text-anchor="middle" dominant-baseline="central"
      font-family="system-ui,sans-serif" font-size="\${text.length>2?9:11}" font-weight="700" fill="#fff">\${text}</text>
  </svg>\`;
}

if (!MARKERS.length) {
  map.setView(CENTER, 14);
} else {
  const bounds = [];
  const dayNums = [...new Set(MARKERS.map(m=>m.day))].sort();

  dayNums.forEach(d => {
    const dm = MARKERS.filter(m=>m.day===d).sort((a,b)=>['morning','afternoon','evening'].indexOf(a.slot)-['morning','afternoon','evening'].indexOf(b.slot));
    if(dm.length>1) {
      L.polyline(dm.map(m=>[m.lat,m.lng]),{color:'#94a3b8',weight:2,dashArray:'6 4',opacity:0.6}).addTo(map);
    }
  });

  MARKERS.forEach(m => {
    bounds.push([m.lat,m.lng]);
    const icon = L.divIcon({
      html: svgPin(m.color, m.label),
      className:'', iconSize:[36,44], iconAnchor:[18,44], popupAnchor:[0,-46]
    });
    const gm = \`https://www.google.com/maps/search/?api=1&query=\${m.lat},\${m.lng}\`;
    const wz = \`https://waze.com/ul?ll=\${m.lat},\${m.lng}&navigate=yes\`;
    const slotLabel = {morning:'🌅 Morning',afternoon:'☀️ Afternoon',evening:'🌙 Evening'}[m.slot]||m.slot;
    const popup = L.popup({maxWidth:260,className:'custom-popup'}).setContent(\`
      <div>
        <div class="popup-name">\${m.name}</div>
        <div class="popup-meta">\${m.type} · Day \${m.day} · \${slotLabel}\${m.address?'<br>📍 '+m.address:''}</div>
        <div class="popup-pills">
          <span class="pill pill-cost">\${m.cost>0?'💰 '+m.cost+' ILS':'FREE'}</span>
          \${m.duration?'<span class="pill pill-dur">⏱ '+m.duration+'</span>':''}
        </div>
        <div class="popup-links">
          <a href="\${gm}" target="_blank">🗺 Google Maps</a>
          <a href="\${wz}" target="_blank" class="waze">🚗 Waze</a>
        </div>
      </div>
    \`);
    L.marker([m.lat,m.lng],{icon}).addTo(map).bindPopup(popup);
  });

  map.fitBounds(bounds, {padding:[40,40],maxZoom:17});
}
</script>
</body>
</html>`;
}

export default function TripMapModal({ tripPlanId, tripPlan, onClose }) {
  const [mapData,  setMapData]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [activeDay,setActiveDay]= useState(0);
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
      const COLORS = { morning: "#1E6B4A", afternoon: "#2C5F8A", evening: "#0F3D2E" };
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
              enriched.push({ ...c, dayNumber: day.day, slot, slotIndex: slotIdx,
                estimatedCost: s.estimatedCost ?? 0, duration: s.duration ?? "",
                color: COLORS[slot] ?? "#0F3D2E", name: s.name ?? c.name, type: s.type ?? c.type });
            }
          setMapData({ cityCenter: coordData.cityCenter, markers: enriched });
        })
        .catch(e => setError(e?.response?.data?.message ?? e?.message ?? "Failed to load map"))
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false); setError("No places in this plan.");
  }, [tripPlanId, tripPlan]);

  // Build blob URL when mapData changes or day filter changes
  const [iframeSrc, setIframeSrc] = useState("");
  useEffect(() => {
    if (!mapData?.markers) return;
    const filtered = activeDay === 0 ? mapData.markers : mapData.markers.filter(m => m.dayNumber === activeDay);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const html  = buildMapHtml(filtered, mapData.cityCenter);
    const blob  = new Blob([html], { type: "text/html" });
    const url   = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    setIframeSrc(url);
  }, [mapData, activeDay]);

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const days = mapData?.markers ? [...new Set(mapData.markers.map(m => m.dayNumber))].sort() : [];

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>🗺 Trip Map</h2>
            {mapData?.cityCenter?.name && <p className={styles.subtitle}>{mapData.cityCenter.name}</p>}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.legend}>
          {Object.entries(SLOT_META).map(([slot, meta]) => (
            <span key={slot} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: meta.color }} />
              {meta.emoji} {meta.label}
            </span>
          ))}
        </div>

        {days.length > 1 && (
          <div className={styles.dayPills}>
            <button className={`${styles.dayPill} ${activeDay === 0 ? styles.dayPillActive : ""}`}
              onClick={() => setActiveDay(0)}>All Days</button>
            {days.map(d => (
              <button key={d} className={`${styles.dayPill} ${activeDay === d ? styles.dayPillActive : ""}`}
                onClick={() => setActiveDay(d)}>Day {d}</button>
            ))}
          </div>
        )}

        <div className={styles.mapWrap}>
          {loading && <div className={styles.state}><span className={styles.spinner} /> Loading map…</div>}
          {error && !loading && <div className={styles.stateError}><span style={{fontSize:32}}>⚠️</span><p>{error}</p></div>}
          {!loading && !error && iframeSrc && (
            <iframe
              src={iframeSrc}
              className={styles.map}
              title="Trip Map"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            />
          )}
        </div>

        {!loading && !error && mapData?.markers?.length > 0 && (
          <div className={styles.markerList}>
            {(activeDay === 0 ? mapData.markers : mapData.markers.filter(m => m.dayNumber === activeDay))
              .map((m) => {
                const meta = SLOT_META[m.slot] ?? SLOT_META.morning;
                const emoji = TYPE_EMOJI[m.type] ?? "📍";
                return (
                  <div key={`${m.placeId}-${m.dayNumber}-${m.slot}`} className={styles.markerRow}>
                    <div className={styles.markerPin} style={{ background: meta.color }}>
                      {m.dayNumber}{(m.slot||"")[0]?.toUpperCase()}
                    </div>
                    <div className={styles.markerInfo}>
                      <span className={styles.markerName}>{emoji} {m.name}</span>
                      <span className={styles.markerMeta}>
                        {meta.emoji} {meta.label} · Day {m.dayNumber}
                        {m.estimatedCost > 0 ? ` · ${m.estimatedCost} ILS` : " · Free"}
                      </span>
                    </div>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                      target="_blank" rel="noreferrer" className={styles.markerLink}>Open</a>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
