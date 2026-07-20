import React, { useState, useEffect } from 'react';

const AnimatedCounter = ({ value, duration = 1000, prefix = '', suffix = '', isCurrency = false }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    if (isNaN(numericValue)) {
      setCount(value);
      return;
    }

    let startTimestamp = null;
    const startValue = 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (easeOutExpo)
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easedProgress * (numericValue - startValue) + startValue);
      
      setCount(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(numericValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  const formatDisplay = (num) => {
    if (typeof num !== 'number') return num;
    if (isCurrency) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(num);
    }
    return num.toLocaleString('en-IN');
  };

  return <span>{prefix}{formatDisplay(count)}{suffix}</span>;
};

export default AnimatedCounter;
