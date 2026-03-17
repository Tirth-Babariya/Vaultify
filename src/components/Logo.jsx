'use client';

export default function Logo({ size = 24, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-colors duration-300`}
    >
      {/* Outer Lock Body */}
      <rect 
        x="4" 
        y="10" 
        width="16" 
        height="10" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
      />
      {/* Lock Shackle */}
      <path 
        d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle 
        cx="12" 
        cy="15" 
        r="1.5" 
        fill="currentColor"
      />
      <path 
        d="M12 16.5V18" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  );
}
