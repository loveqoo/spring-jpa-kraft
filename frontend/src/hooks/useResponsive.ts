import { useState, useEffect } from 'react';

interface Breakpoints {
  isMobile: boolean;        // <= 768px
  isTablet: boolean;        // <= 1024px
  isDesktop: boolean;       // > 1024px
  isWideDesktop: boolean;   // >= 1280px
  isExtraWide: boolean;     // >= 1600px
}

function getBreakpoints(width: number): Breakpoints {
  return {
    isMobile: width <= 768,
    isTablet: width > 768 && width <= 1024,
    isDesktop: width > 1024,
    isWideDesktop: width >= 1280,
    isExtraWide: width >= 1600,
  };
}

export function useResponsive(): Breakpoints {
  const [bp, setBp] = useState(() => getBreakpoints(window.innerWidth));

  useEffect(() => {
    const handleResize = () => {
      const next = getBreakpoints(window.innerWidth);
      setBp((prev) =>
        prev.isMobile === next.isMobile &&
        prev.isTablet === next.isTablet &&
        prev.isDesktop === next.isDesktop &&
        prev.isWideDesktop === next.isWideDesktop &&
        prev.isExtraWide === next.isExtraWide
          ? prev
          : next,
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return bp;
}
