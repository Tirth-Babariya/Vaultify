'use client';

export default function Logo({ size = 24, className = "", animate = "" }) {
  const isUnlocked = animate === 'unlocked';
  const isShake = animate === 'shake';

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-all duration-500 overflow-visible ${
        isShake ? 'animate-shake-real text-red-500' : ''
      } ${isUnlocked ? 'text-green-500 filter drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : ''}`}
    >
      <style>{`
        @keyframes shake-real {
          0%, 100% { transform: translateX(0) rotate(0); }
          20% { transform: translateX(-3px) rotate(-2deg); }
          40% { transform: translateX(3px) rotate(2deg); }
          60% { transform: translateX(-3px) rotate(-1deg); }
          80% { transform: translateX(3px) rotate(1deg); }
        }
        .animate-shake-real { 
          animation: shake-real 0.3s cubic-bezier(.36,.07,.19,.97) both;
        }

        @keyframes unlock-spring {
          0% { transform: translateY(0) rotate(0); }
          40% { transform: translateY(-5px) rotate(25deg); }
          70% { transform: translateY(-3px) rotate(18deg); }
          100% { transform: translateY(-4px) rotate(20deg); }
        }
        .animate-unlock-spring {
          animation: unlock-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes pulse-success {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-pulse-success {
          animation: pulse-success 0.4s ease-out;
        }
      `}</style>
      
      {/* Outer Lock Body */}
      <rect 
        x="4" 
        y="10" 
        width="16" 
        height="10" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="2"
        className="transition-colors duration-500"
      />
      {/* Lock Shackle */}
      <path 
        d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        className={`transition-all duration-500 origin-bottom ${
          isUnlocked ? 'animate-unlock-spring' : ''
        }`}
        style={{
          transformOrigin: '16px 10px'
        }}
      />
      {/* Keyhole */}
      <circle 
        cx="12" 
        cy="15" 
        r="1.5" 
        fill="currentColor"
        className="transition-colors duration-500"
      />
      <path 
        d="M12 16.5V18" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
        className="transition-colors duration-500"
      />
    </svg>
  );
}
