// app/(components)/ui/Input.jsx
'use client';
export const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={`input ${className}`}
      {...props}
    />
  );
};