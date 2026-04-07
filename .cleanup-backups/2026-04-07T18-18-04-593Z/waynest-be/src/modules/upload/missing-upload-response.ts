export const MISSING_UPLOAD_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Image unavailable">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#17324d"/>
      <stop offset="100%" stop-color="#2ba7cf"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="48" fill="#09111b"/>
  <rect x="36" y="36" width="440" height="440" rx="36" fill="url(#bg)" opacity="0.92"/>
  <circle cx="256" cy="188" r="76" fill="#ffffff" opacity="0.18"/>
  <path d="M140 380c18-62 69-104 116-104s98 42 116 104" fill="#08111a" opacity="0.24"/>
  <path d="M156 356l54-62 46 40 58-74 42 40 40-48 60 104H156z" fill="#ffffff" opacity="0.18"/>
  <text x="256" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff" opacity="0.92">Image unavailable</text>
</svg>`;

export const applyUploadResponseHeaders = (res: {
  setHeader(name: string, value: string): void;
}) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
};

