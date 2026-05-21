'use client';

import { useState, useEffect, InputHTMLAttributes } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  float?: boolean;
}

export function NumberInput({ value, onChange, float, onBlur, ...rest }: NumberInputProps) {
  const [display, setDisplay] = useState(value === 0 ? '' : String(value));

  useEffect(() => {
    const parsed = float ? parseFloat(display) : parseInt(display);
    if (display === '' && value === 0) return;
    if (!isNaN(parsed) && parsed === value) return;
    setDisplay(value === 0 ? '' : String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      setDisplay(raw);
      onChange(0);
      return;
    }
    const cleaned = raw.replace(/^0+(?=\d)/, '');
    setDisplay(cleaned);
    const num = float ? parseFloat(cleaned) : parseInt(cleaned);
    if (!isNaN(num)) onChange(num);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (display === '' || display === '-') {
      setDisplay('');
    }
    onBlur?.(e);
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode={float ? 'decimal' : 'numeric'}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
