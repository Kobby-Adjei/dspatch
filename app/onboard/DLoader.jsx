export default function DLoader({ label = "Setting up your agent…" }) {
  return (
    <div className="d-loader-enter fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black">

      {/* spinner + D mark */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>

        {/* outer glow ring — static, subtle */}
        <svg
          width="160" height="160" viewBox="0 0 160 160"
          className="absolute inset-0"
          aria-hidden="true"
        >
          <circle cx="80" cy="80" r="72" fill="none"
            stroke="rgba(249,115,22,0.07)" strokeWidth="1" />
        </svg>

        {/* spinning gradient arc */}
        <svg
          width="160" height="160" viewBox="0 0 160 160"
          className="d-arc absolute inset-0"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="arcGrad" gradientUnits="userSpaceOnUse"
              x1="80" y1="8" x2="152" y2="80">
              <stop offset="0%"   stopColor="#f97316" stopOpacity="0" />
              <stop offset="60%"  stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="1" />
            </linearGradient>
          </defs>
          <circle
            cx="80" cy="80" r="72"
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="1.5"
            strokeDasharray="100 352"
            strokeLinecap="round"
          />
        </svg>

        {/* inner track ring */}
        <svg
          width="130" height="130" viewBox="0 0 130 130"
          className="absolute inset-[15px]"
          aria-hidden="true"
        >
          <circle cx="65" cy="65" r="58" fill="none"
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </svg>

        {/* D mark — the actual logo path, centered */}
        <svg
          className="d-mark relative z-10"
          width="58" height="58"
          viewBox="380 310 290 380"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="dGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#FF8A1C" />
              <stop offset="55%"  stopColor="#FF6A00" />
              <stop offset="100%" stopColor="#E95A00" />
            </linearGradient>
            <filter id="dGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feFlood floodColor="#FF6A00" floodOpacity="0.35" />
              <feComposite in2="blur" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M438 342
               H516
               C583 342 626 386 626 452
               C626 518 583 556 516 556
               H514
               V506
               C514 495 507 488 496 488
               H483
               L438 545
               Z"
            fill="url(#dGrad)"
            filter="url(#dGlow)"
          />
        </svg>
      </div>

      {/* label */}
      <p className="mt-10 text-xs font-semibold tracking-[0.2em] text-white/30 uppercase">
        {label}
      </p>
    </div>
  );
}
