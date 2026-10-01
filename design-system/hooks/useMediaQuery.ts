import { useEffect, useState } from 'react';

/** True while the media query matches, e.g. useMediaQuery('(max-width: 899px)'). */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

/** Below the 900px layout breakpoint (drawer + bottom tab bar). */
export const useIsMobile = () => useMediaQuery('(max-width: 899px)');
