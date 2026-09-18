import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}

/**
 * Minimal inline SVG trend line — no axes, no labels, just a quick visual
 * "shape" of recent activity. Deliberately lightweight (no charting library)
 * since it's rendered multiple times per page inside small KPI cards.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 28,
  stroke = '#ffffff',
  fill = 'rgba(255,255,255,0.25)',
  strokeWidth = 1.75,
}) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block overflow-visible">
      <path d={areaPath} fill={fill} stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
