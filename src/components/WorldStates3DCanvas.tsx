import React, { useEffect, useMemo, useRef } from 'react';
import type { AppVisitLog } from '../types';

interface WorldStates3DCanvasProps {
  logs: AppVisitLog[];
  className?: string;
  focusBrazil?: boolean;
  interactive?: boolean;
}

interface BrStateCoord {
  uf: string;
  name: string;
  lat: number;
  lng: number;
  region: 'N' | 'NE' | 'CO' | 'SE' | 'S';
}

// All 27 Brazilian Federative Units (real geographic coordinates)
export const BRAZIL_STATES_3D: BrStateCoord[] = [
  { uf: 'AP', name: 'Amapá', lat: 0.0349, lng: -51.0694, region: 'N' },
  { uf: 'RR', name: 'Roraima', lat: 2.8235, lng: -60.6758, region: 'N' },
  { uf: 'AM', name: 'Amazonas', lat: -3.119, lng: -60.0217, region: 'N' },
  { uf: 'PA', name: 'Pará', lat: -1.4558, lng: -48.4902, region: 'N' },
  { uf: 'AC', name: 'Acre', lat: -9.9749, lng: -67.8243, region: 'N' },
  { uf: 'RO', name: 'Rondônia', lat: -8.7612, lng: -63.9004, region: 'N' },
  { uf: 'TO', name: 'Tocantins', lat: -10.184, lng: -48.3336, region: 'N' },
  { uf: 'MA', name: 'Maranhão', lat: -2.5307, lng: -44.3068, region: 'NE' },
  { uf: 'PI', name: 'Piauí', lat: -5.092, lng: -42.8038, region: 'NE' },
  { uf: 'CE', name: 'Ceará', lat: -3.7319, lng: -38.5267, region: 'NE' },
  { uf: 'RN', name: 'Rio Grande do Norte', lat: -5.7945, lng: -35.211, region: 'NE' },
  { uf: 'PB', name: 'Paraíba', lat: -7.1195, lng: -34.845, region: 'NE' },
  { uf: 'PE', name: 'Pernambuco', lat: -8.0476, lng: -34.877, region: 'NE' },
  { uf: 'AL', name: 'Alagoas', lat: -9.6658, lng: -35.735, region: 'NE' },
  { uf: 'SE', name: 'Sergipe', lat: -10.9472, lng: -37.0731, region: 'NE' },
  { uf: 'BA', name: 'Bahia', lat: -12.9714, lng: -38.5014, region: 'NE' },
  { uf: 'MT', name: 'Mato Grosso', lat: -15.601, lng: -56.0974, region: 'CO' },
  { uf: 'GO', name: 'Goiás', lat: -16.6869, lng: -49.2648, region: 'CO' },
  { uf: 'DF', name: 'Distrito Federal', lat: -15.7975, lng: -47.8919, region: 'CO' },
  { uf: 'MS', name: 'Mato Grosso do Sul', lat: -20.4697, lng: -54.6201, region: 'CO' },
  { uf: 'MG', name: 'Minas Gerais', lat: -19.9167, lng: -43.9345, region: 'SE' },
  { uf: 'ES', name: 'Espírito Santo', lat: -20.3155, lng: -40.3128, region: 'SE' },
  { uf: 'RJ', name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, region: 'SE' },
  { uf: 'SP', name: 'São Paulo', lat: -23.5505, lng: -46.6333, region: 'SE' },
  { uf: 'PR', name: 'Paraná', lat: -25.4284, lng: -49.2733, region: 'S' },
  { uf: 'SC', name: 'Santa Catarina', lat: -27.5954, lng: -48.548, region: 'S' },
  { uf: 'RS', name: 'Rio Grande do Sul', lat: -30.0346, lng: -51.2177, region: 'S' },
];

// Stylized continental polygons (lat, lng pairs) for 3D World Globe silhouette
const CONTINENT_OUTLINES: Array<Array<[number, number]>> = [
  // South America
  [
    [11, -74], [10, -62], [5, -52], [0, -49], [-5, -35], [-13, -38], [-23, -43],
    [-35, -53], [-54, -68], [-45, -75], [-18, -71], [-5, -81], [6, -77], [11, -74],
  ],
  // North America
  [
    [70, -165], [60, -140], [50, -125], [32, -117], [18, -104], [9, -82], [20, -87],
    [25, -80], [42, -70], [52, -56], [62, -64], [70, -95], [70, -165],
  ],
  // Europe
  [
    [36, -9], [43, -9], [48, -4], [54, 8], [60, 5], [70, 25], [62, 42],
    [47, 38], [41, 29], [38, 15], [40, 0], [36, -9],
  ],
  // Africa
  [
    [35, -6], [37, 10], [31, 32], [12, 44], [11, 51], [-12, 40], [-34, 20],
    [-22, 14], [4, 9], [5, -8], [15, -17], [35, -6],
  ],
  // Asia
  [
    [42, 29], [55, 40], [68, 70], [72, 130], [62, 165], [42, 140], [22, 114],
    [8, 105], [16, 97], [8, 77], [25, 62], [30, 48], [42, 29],
  ],
  // Australia
  [
    [-12, 130], [-14, 142], [-28, 153], [-38, 145], [-34, 115], [-21, 114], [-12, 130],
  ],
];

// Regional border connection mesh inside Brazil to visualize state divisions
const BRAZIL_STATE_LINKS: Array<[string, string]> = [
  ['RR', 'AM'], ['RR', 'PA'], ['AP', 'PA'], ['AM', 'AC'], ['AM', 'RO'], ['AM', 'PA'],
  ['AM', 'MT'], ['RO', 'MT'], ['PA', 'MT'], ['PA', 'TO'], ['PA', 'MA'], ['TO', 'MA'],
  ['TO', 'PI'], ['TO', 'BA'], ['TO', 'GO'], ['TO', 'MT'], ['MA', 'PI'], ['PI', 'CE'],
  ['PI', 'PE'], ['PI', 'BA'], ['CE', 'RN'], ['CE', 'PB'], ['CE', 'PE'], ['RN', 'PB'],
  ['PB', 'PE'], ['PE', 'AL'], ['PE', 'BA'], ['AL', 'SE'], ['AL', 'BA'], ['SE', 'BA'],
  ['BA', 'MG'], ['BA', 'ES'], ['BA', 'GO'], ['MT', 'GO'], ['MT', 'MS'], ['GO', 'DF'],
  ['GO', 'MG'], ['GO', 'MS'], ['MS', 'MG'], ['MS', 'SP'], ['MS', 'PR'], ['MG', 'ES'],
  ['MG', 'RJ'], ['MG', 'SP'], ['ES', 'RJ'], ['RJ', 'SP'], ['SP', 'PR'], ['PR', 'SC'],
  ['SC', 'RS'],
];

const REGION_COLOR: Record<BrStateCoord['region'], string> = {
  N: '#34d399',
  NE: '#fbbf24',
  CO: '#38bdf8',
  SE: '#f59e0b',
  S: '#a78bfa',
};

function matchStateUf(stateStr: string): string | null {
  if (!stateStr) return null;
  const upper = stateStr.toUpperCase();
  const parenMatch = upper.match(/\(([A-Z]{2})\)/);
  if (parenMatch && BRAZIL_STATES_3D.some((s) => s.uf === parenMatch[1])) {
    return parenMatch[1];
  }
  for (const st of BRAZIL_STATES_3D) {
    if (upper === st.uf || upper.includes(st.name.toUpperCase())) {
      return st.uf;
    }
  }
  return null;
}

function projectPoint(
  latDeg: number,
  lngDeg: number,
  rotLng: number,
  rotLat: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number; z: number; visible: boolean } {
  const lat = (latDeg * Math.PI) / 180;
  const lng = (lngDeg * Math.PI) / 180 + rotLng;

  const x0 = Math.cos(lat) * Math.sin(lng);
  const y0 = Math.sin(lat);
  const z0 = Math.cos(lat) * Math.cos(lng);

  // Tilt around X axis
  const cosT = Math.cos(rotLat);
  const sinT = Math.sin(rotLat);
  const y1 = y0 * cosT - z0 * sinT;
  const z1 = y0 * sinT + z0 * cosT;

  return {
    x: cx + x0 * radius,
    y: cy - y1 * radius,
    z: z1,
    visible: z1 > -0.08,
  };
}

export const WorldStates3DCanvas: React.FC<WorldStates3DCanvasProps> = ({
  logs,
  className = '',
  focusBrazil = true,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    rotLng: number;
    rotLat: number;
    autoSpin: boolean;
  }>({
    active: false,
    lastX: 0,
    lastY: 0,
    // Start centered on Brazil (~ -52 deg longitude, -14 deg latitude)
    rotLng: focusBrazil ? (52 * Math.PI) / 180 : 0.85,
    rotLat: focusBrazil ? (-15 * Math.PI) / 180 : -0.22,
    autoSpin: true,
  });

  const activeData = useMemo(() => {
    const stateCounts = new Map<string, number>();
    const gpsPins: Array<{ lat: number; lng: number; label: string }> = [];

    for (const log of logs) {
      const uf = matchStateUf(log.state || '');
      if (uf) {
        stateCounts.set(uf, (stateCounts.get(uf) || 0) + 1);
      }
      if (typeof log.latitude === 'number' && typeof log.longitude === 'number') {
        gpsPins.push({
          lat: log.latitude,
          lng: log.longitude,
          label: `${log.city} (${uf || log.country})`,
        });
      }
    }

    return { stateCounts, gpsPins: gpsPins.slice(0, 30) };
  }, [logs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let tick = 0;

    const stateLookup = new Map<string, BrStateCoord>();
    BRAZIL_STATES_3D.forEach((s) => stateLookup.set(s.uf, s));

    const render = () => {
      tick += 0.025;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(240, rect.width);
      const height = Math.max(220, rect.height);

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      if (dragRef.current.autoSpin && !dragRef.current.active) {
        if (focusBrazil) {
          // Gentle oscillatory orbit centered around Brazil + full world view
          dragRef.current.rotLng += 0.0024;
        } else {
          dragRef.current.rotLng += 0.003;
        }
      }

      const cx = width * 0.5;
      const cy = height * 0.5;
      const radius = Math.min(width, height) * 0.41;
      const rotLng = dragRef.current.rotLng;
      const rotLat = dragRef.current.rotLat;

      // Atmospheric outer glow
      const atmo = ctx.createRadialGradient(cx, cy, radius * 0.72, cx, cy, radius * 1.24);
      atmo.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
      atmo.addColorStop(0.65, 'rgba(5, 150, 105, 0.09)');
      atmo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = atmo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.24, 0, Math.PI * 2);
      ctx.fill();

      // 3D Sphere ocean body
      const sphereGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      sphereGrad.addColorStop(0, 'rgba(6, 52, 38, 0.92)');
      sphereGrad.addColorStop(0.65, 'rgba(3, 24, 18, 0.95)');
      sphereGrad.addColorStop(1, 'rgba(1, 10, 7, 0.98)');

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.32)';
      ctx.lineWidth = 1.25;
      ctx.stroke();

      // Clip interior lines to sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Latitude parallels
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.12)';
      ctx.lineWidth = 0.7;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lng = -180; lng <= 180; lng += 8) {
          const p = projectPoint(lat, lng, rotLng, rotLat, radius, cx, cy);
          if (p.z > 0) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Longitude meridians
      for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -85; lat <= 85; lat += 6) {
          const p = projectPoint(lat, lng, rotLng, rotLat, radius, cx, cy);
          if (p.z > 0) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // World Continents Outlines
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.36)';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.11)';
      ctx.lineWidth = 1;
      for (const poly of CONTINENT_OUTLINES) {
        ctx.beginPath();
        let started = false;
        let visibleCount = 0;
        for (const [lat, lng] of poly) {
          const p = projectPoint(lat, lng, rotLng, rotLat, radius, cx, cy);
          if (p.z > -0.05) {
            visibleCount++;
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        if (visibleCount > 3) {
          ctx.fill();
          ctx.stroke();
        }
      }

      // Brazil State Division Mesh (connections between neighboring Brazilian states)
      ctx.lineWidth = 0.9;
      for (const [ufA, ufB] of BRAZIL_STATE_LINKS) {
        const a = stateLookup.get(ufA);
        const b = stateLookup.get(ufB);
        if (!a || !b) continue;
        const pa = projectPoint(a.lat, a.lng, rotLng, rotLat, radius, cx, cy);
        const pb = projectPoint(b.lat, b.lng, rotLng, rotLat, radius, cx, cy);
        if (pa.z > 0.05 && pb.z > 0.05) {
          const activeLink =
            activeData.stateCounts.has(ufA) || activeData.stateCounts.has(ufB);
          ctx.strokeStyle = activeLink
            ? 'rgba(251, 191, 36, 0.72)'
            : 'rgba(52, 211, 153, 0.42)';
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      }

      // Plot all 27 Brazilian State UF nodes on the 3D Globe
      for (const st of BRAZIL_STATES_3D) {
        const p = projectPoint(st.lat, st.lng, rotLng, rotLat, radius, cx, cy);
        if (p.z <= 0.05) continue;

        const hits = activeData.stateCounts.get(st.uf) || 0;
        const depthAlpha = Math.min(1, 0.35 + p.z * 0.65);

        if (hits > 0) {
          // Animated pulsing beacon for active state
          const pulseR = 5 + ((Math.sin(tick * 2.5 + st.lat) + 1) * 0.5) * 9;
          ctx.beginPath();
          ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(251, 191, 36, ${0.75 * depthAlpha})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.3, 0, Math.PI * 2);
          ctx.fillStyle = REGION_COLOR[st.region];
          ctx.globalAlpha = depthAlpha * 0.85;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Crisp UF code label
        ctx.font = hits > 0 ? 'bold 10px monospace' : 'bold 8.5px monospace';
        ctx.fillStyle = hits > 0 ? '#fef08a' : `rgba(209, 250, 229, ${depthAlpha * 0.9})`;
        ctx.fillText(hits > 0 ? `${st.uf}(${hits})` : st.uf, p.x + 4.5, p.y + 3);
      }

      // Consented GPS Exact Pins
      for (const pin of activeData.gpsPins) {
        const p = projectPoint(pin.lat, pin.lng, rotLng, rotLat, radius, cx, cy);
        if (p.z <= 0.05) continue;
        const pulse = 6 + ((Math.sin(tick * 3.2) + 1) * 0.5) * 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = '#fb7185';
        ctx.fill();
      }

      ctx.restore();
      ctx.restore();

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [activeData, focusBrazil]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    dragRef.current.active = true;
    dragRef.current.autoSpin = false;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    dragRef.current.rotLng += dx * 0.008;
    dragRef.current.rotLat = Math.max(
      -1.15,
      Math.min(1.15, dragRef.current.rotLat + dy * 0.008)
    );
  };

  const handlePointerUp = () => {
    if (!interactive) return;
    dragRef.current.active = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label="Globo 3D do Mundo dividido por Estados do Brasil"
      className={`w-full h-full block ${interactive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'} ${className}`}
    />
  );
};
