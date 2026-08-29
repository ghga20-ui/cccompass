/** 배경 장식용 컴퍼스 로즈 + 방위 그리드 (currentColor로 색 상속). 랜딩·학생 홈 공용. */
export function CompassMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth="1">
        <circle cx="200" cy="200" r="72" opacity="0.5" />
        <circle cx="200" cy="200" r="120" opacity="0.35" />
        <circle cx="200" cy="200" r="168" opacity="0.22" />
        <circle cx="200" cy="200" r="196" opacity="0.12" />
        <line x1="200" y1="6" x2="200" y2="394" opacity="0.22" />
        <line x1="6" y1="200" x2="394" y2="200" opacity="0.22" />
        <line x1="62" y1="62" x2="338" y2="338" opacity="0.1" />
        <line x1="338" y1="62" x2="62" y2="338" opacity="0.1" />
      </g>
      <path
        d="M200 42 L213 187 L262 200 L213 213 L200 358 L187 213 L138 200 L187 187 Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M200 42 L213 187 L200 200 L187 187 Z"
        fill="currentColor"
        opacity="0.24"
      />
    </svg>
  );
}
