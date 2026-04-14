export default function LogoSVG({ height = 48, color = '#ffffff', className = '' }) {
  const w = height * 3.8;
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 760 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Куб / окно — 3D изометрия (как в оригинале) */}
      <g stroke={color} strokeWidth="5" fill="none" strokeLinejoin="round">
        {/* Передняя грань (левая) */}
        <polygon points="28,100 80,58 80,178 28,178" fill={color} fillOpacity="0.15" />
        {/* Верхняя грань */}
        <polygon points="28,100 80,58 132,82 80,122" fill={color} fillOpacity="0.25" />
        {/* Боковая грань (правая) */}
        <polygon points="80,58 132,82 132,178 80,178" fill={color} fillOpacity="0.08" />
        {/* Ребра к вершине (крыша) */}
        <line x1="80" y1="20" x2="28" y2="100" />
        <line x1="80" y1="20" x2="132" y2="82" />
        <line x1="80" y1="20" x2="80" y2="58" />
      </g>

      {/* Текст КОМФОРТ+ */}
      <text
        x="155"
        y="142"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="100"
        fill={color}
        letterSpacing="4"
      >
        КОМФОРТ+
      </text>

      {/* Линия под текстом */}
      <line x1="155" y1="162" x2="740" y2="162" stroke={color} strokeWidth="4" />
    </svg>
  );
}
