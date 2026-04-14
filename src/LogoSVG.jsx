export default function LogoSVG({ height = 48, color = '#ffffff', className = '' }) {
  // Пропорции оригинала ~630x520, но основной контент ~600x280
  const w = height * 2.6;
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 520 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Куб / окно — 3D изометрия */}
      <g stroke={color} strokeWidth="4" fill="none" strokeLinejoin="round">
        {/* Передняя грань */}
        <polygon points="30,95 75,60 75,170 30,170" fill={color} fillOpacity="0.12" />
        {/* Верхняя грань */}
        <polygon points="30,95 75,60 120,80 75,115" fill={color} fillOpacity="0.2" />
        {/* Боковая грань */}
        <polygon points="75,60 120,80 120,170 75,170" fill={color} fillOpacity="0.08" />
        {/* Рёбра крыши/верха */}
        <line x1="75" y1="28" x2="30" y2="95" />
        <line x1="75" y1="28" x2="120" y2="80" />
        <line x1="75" y1="28" x2="75" y2="60" />
      </g>

      {/* Текст КОМФОРТ+ */}
      <text
        x="140"
        y="138"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="90"
        fill={color}
        letterSpacing="2"
      >
        КОМФОРТ
      </text>
      <text
        x="478"
        y="138"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="700"
        fontSize="90"
        fill={color}
      >
        +
      </text>

      {/* Линия под текстом */}
      <line x1="140" y1="155" x2="510" y2="155" stroke={color} strokeWidth="3.5" />
    </svg>
  );
}
