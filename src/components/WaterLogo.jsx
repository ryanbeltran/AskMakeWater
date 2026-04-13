export default function WaterLogo({ className = '' }) {
  return (
    <svg
      viewBox="0 0 180 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MakeWater logo"
    >
      {/* MW wave mark - simplified version of the brand logomark */}
      <path
        d="M8 45 C8 45, 8 20, 20 20 C32 20, 32 45, 44 45 C56 45, 56 20, 68 20 C80 20, 80 45, 92 45 C104 45, 104 20, 116 20"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
