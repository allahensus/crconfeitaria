'use client';

import React from 'react';

/**
 * A single decorative flourish: a piped-icing squiggle in the brand gradient,
 * used once as the page's signature transition from the hero into the catalog.
 */
export function IcingDivider() {
  return (
    <div aria-hidden="true" className="w-full overflow-hidden leading-none select-none">
      <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-7 sm:h-9">
        <defs>
          <linearGradient id="icingGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#A75644" />
            <stop offset="50%" stopColor="#C27360" />
            <stop offset="100%" stopColor="#D59483" />
          </linearGradient>
        </defs>
        <path
          d="M0,30 C25,10 75,10 100,30 C125,50 175,50 200,30 C225,10 275,10 300,30 C325,50 375,50 400,30 C425,10 475,10 500,30 C525,50 575,50 600,30 C625,10 675,10 700,30 C725,50 775,50 800,30 C825,10 875,10 900,30 C925,50 975,50 1000,30 C1025,10 1075,10 1100,30 C1125,50 1175,50 1200,30"
          fill="none"
          stroke="url(#icingGradient)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
