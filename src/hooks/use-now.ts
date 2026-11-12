import React from "react";

/** The current time in ms, updated every `intervalMs`. Pauses while the tab is hidden. */
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      window.clearInterval(timer);
      setNow(Date.now());
      timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    };
    const onVisibility = () => (document.hidden ? window.clearInterval(timer) : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
};
