import { useCallback, useEffect, useState } from 'react';

interface UseCountdownProps {
  name: string;
  duration: number;
  startTime: number;
}

export const useCountdown = ({ name, duration, startTime }: UseCountdownProps): number => {
  const remaining = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, duration - elapsed);
  }, [duration, startTime]);

  const [countdown, setCountdown] = useState(remaining);

  useEffect(() => {
    const tick = () => {
      const next = remaining();
      setCountdown(next);
      if (next <= 0) clearInterval(intervalId);
    };

    const timeoutId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [name, remaining]);

  return countdown;
};
