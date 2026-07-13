import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

let lastTrackedLocation: string | null = null;

const MetaPixelPageViews = () => {
  const location = useLocation();

  useEffect(() => {
    const currentLocation = `${location.pathname}${location.search}`;

    // The base snippet in index.html records the initial page load.
    if (lastTrackedLocation === null) {
      lastTrackedLocation = currentLocation;
      return;
    }

    if (lastTrackedLocation === currentLocation) return;

    lastTrackedLocation = currentLocation;
    window.fbq?.("track", "PageView");
  }, [location.pathname, location.search]);

  return null;
};

export default MetaPixelPageViews;
