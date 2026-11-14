"use client";

export function HeroBackground() {
  return (
    <div className="hero-background" aria-hidden="true">
      <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hero-cloth" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f8e9df" />
            <stop offset="0.46" stopColor="#f2d7cc" />
            <stop offset="1" stopColor="#c7d2d2" />
          </linearGradient>
          <radialGradient id="hero-sunlight" cx="50%" cy="46%" r="58%">
            <stop offset="0" stopColor="#fff9e9" stopOpacity="0.92" />
            <stop offset="0.48" stopColor="#f8d6b8" stopOpacity="0.38" />
            <stop offset="1" stopColor="#f8d6b8" stopOpacity="0" />
          </radialGradient>
          <filter id="hero-folds" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.035"
              numOctaves="2"
              seed="12"
              result="linen"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="linen"
              scale="34"
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="hero-soften" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <pattern id="hero-weave" width="13" height="13" patternUnits="userSpaceOnUse">
            <path d="M0 2H13M0 8H13" stroke="#fffaf1" strokeOpacity="0.16" />
            <path d="M2 0V13M8 0V13" stroke="#b68e8a" strokeOpacity="0.08" />
          </pattern>
        </defs>
        <rect width="1200" height="520" fill="url(#hero-cloth)" />
        <g className="hero-fold-group" filter="url(#hero-folds)" opacity="0.72">
          <path d="M-80 120C170 20 260 250 500 130S850 40 1280 180V600H-80Z" fill="#fff4e9" />
          <path d="M-100 360C170 160 330 440 610 280S930 250 1300 360V600H-100Z" fill="#c6d1d2" opacity="0.74" />
          <path d="M-100 470C190 340 340 540 620 410S960 360 1300 470V600H-100Z" fill="#f7cdbd" opacity="0.62" />
        </g>
        <ellipse className="hero-light-band" cx="480" cy="190" rx="430" ry="240" fill="url(#hero-sunlight)" filter="url(#hero-soften)" />
        <rect width="1200" height="520" fill="url(#hero-weave)" opacity="0.7" />
      </svg>
    </div>
  );
}
