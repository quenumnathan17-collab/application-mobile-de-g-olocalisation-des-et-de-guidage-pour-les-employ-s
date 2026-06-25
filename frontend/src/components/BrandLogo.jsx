import React from 'react';

export default function BrandLogo({ width = 48, height = 48, showText = true, className = '', color = '#3b82f6' }) {
  return (
    <div className={`brand-logo-container ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: `drop-shadow(0px 2px 4px ${color}40)` }}
      >
        {/* Outer Circle */}
        <circle cx="50" cy="50" r="46" stroke="#94a3b8" strokeWidth="1.5" />
        
        {/* 'YA' Text inside */}
        <text x="50" y="28" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="900" fill="#64748b" textAnchor="middle" letterSpacing="1">YA</text>
        
        {/* Bird Gradient */}
        <defs>
          <linearGradient id="birdGrad" x1="20" y1="30" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop stopColor={color} />
            <stop offset="1" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>

        {/* Central Bird Body & Wings */}
        <path 
          d="M50 42 C48 48 44 55 40 50 C30 38 20 35 15 36 C25 45 35 55 45 65 L50 75 L55 65 C65 55 75 45 85 36 C80 35 70 38 60 50 C56 55 52 48 50 42 Z" 
          fill="url(#birdGrad)" 
        />
        
        {/* Wing Accents (Cutouts / Feathers) */}
        <path d="M18 48 C28 55 35 60 40 65" stroke="url(#birdGrad)" strokeWidth="3" strokeLinecap="round" />
        <path d="M82 48 C72 55 65 60 60 65" stroke="url(#birdGrad)" strokeWidth="3" strokeLinecap="round" />
        
        <path d="M25 58 C32 62 36 65 40 68" stroke="url(#birdGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M75 58 C68 62 64 65 60 68" stroke="url(#birdGrad)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Tail Feathers */}
        <path d="M50 78 L50 88" stroke="url(#birdGrad)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M46 76 L40 85" stroke="url(#birdGrad)" strokeWidth="3" strokeLinecap="round" />
        <path d="M54 76 L60 85" stroke="url(#birdGrad)" strokeWidth="3" strokeLinecap="round" />

        {/* Bird Head */}
        <circle cx="50" cy="40" r="3" fill={color} />
      </svg>
      
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ 
            fontFamily: 'system-ui, sans-serif', 
            fontWeight: 800, 
            fontSize: `${width * 0.45}px`, 
            lineHeight: 1,
            color: color,
            letterSpacing: '0.5px'
          }}>
            YA CONSULTING
          </span>
        </div>
      )}
    </div>
  );
}
