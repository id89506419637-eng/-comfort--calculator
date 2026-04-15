export default function LogoSVG({ height = 48, color = '#ffffff', className = '' }) {
  const w = height * (780 / 260);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 780 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
    >
      {/* КУБ / ДОМИК */}
      {/* Залитая левая грань */}
      <path d="M10,100 L80,140 L80,230 L10,190 Z" fill={color} />
      {/* Залитая верхняя левая грань (крыша) */}
      <path d="M80,10 L10,105 L80,140 Z" fill={color} />

      {/* Правая грань — контур */}
      <path d="M80,140 L150,100 L150,190 L80,230 Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill="none" />
      {/* Верхняя правая грань (крыша) — контур */}
      <path d="M80,10 L80,140 L150,100 Z" stroke={color} strokeWidth="3" strokeLinejoin="round" fill="none" />

      {/* Центральное вертикальное ребро */}
      <line x1="80" y1="140" x2="80" y2="230" stroke={color} strokeWidth="3" />
      {/* Нижнее правое ребро */}
      <line x1="80" y1="230" x2="150" y2="190" stroke={color} strokeWidth="3" />

      {/* КОМФОРТ+ */}
      <text
        x="95"
        y="220"
        fontFamily="Arial Black, Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="100"
        fill={color}
      >КОМФОРТ+</text>

      {/* Горизонтальная линия под текстом */}
      <line x1="80" y1="235" x2="720" y2="235" stroke={color} strokeWidth="3" />
    </svg>
  );
}
