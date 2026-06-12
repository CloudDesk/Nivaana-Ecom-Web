import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { hash, pathname, search } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
      return;
    }

    const scrollToPageTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scrollToPageTop();
    const frame = window.requestAnimationFrame(scrollToPageTop);

    return () => window.cancelAnimationFrame(frame);
  }, [hash, pathname, search]);

  return null;
};

export default ScrollToTop;
