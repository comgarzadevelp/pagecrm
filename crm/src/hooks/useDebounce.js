import { useState, useEffect } from 'react';

export default function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Establece el temporizador para actualizar el valor debounced después del retraso
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Función cleanup: si el valor cambia antes de que se cumpla el retraso,
    // se cancela el temporizador anterior y se reinicia.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Solo se vuelve a ejecutar si el valor o el retraso cambian

  return debouncedValue;
}
