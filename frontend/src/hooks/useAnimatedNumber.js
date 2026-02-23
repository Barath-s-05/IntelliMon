import { useState, useEffect, useRef } from "react";

export default function useAnimatedNumber(value, duration = 500) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);

  useEffect(() => {
    let start = startValueRef.current;
    let end = value;
    let startTime = null;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percent = Math.min(progress / duration, 1);

      const current = start + (end - start) * percent;
      setDisplayValue(current);

      if (percent < 1) {
        requestAnimationFrame(animate);
      } else {
        startValueRef.current = end;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return displayValue;
}