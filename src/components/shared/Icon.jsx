import { useState, useEffect } from 'react';

const svgCache = {};

export default function Icon({ src, size = 16, color = 'currentColor', className = '', baseUrl = '' }) {
  const [svg, setSvg] = useState(svgCache[src] || '');
  useEffect(() => {
    if (svgCache[src]) { setSvg(svgCache[src]); return; }
    const url = src.startsWith('/') ? baseUrl + src.slice(1) : src;
    fetch(url).then(r => r.text()).then(t => { svgCache[src] = t; setSvg(t); });
  }, [src, baseUrl]);
  const colored = svg
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);
  return <span className={`icon ${className}`} style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: colored }} />;
}
