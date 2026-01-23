
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Stylized 'C' and 'M' merged based on user image */}
    <path 
      d="M48 64C36.9543 64 28 55.0457 28 44C28 32.9543 36.9543 24 48 24C53.5228 24 58.5228 26.2386 62.1421 29.8579" 
      stroke="#DE3151" 
      strokeWidth="12" 
      strokeLinecap="round" 
    />
    <path 
      d="M60 64V36L74 52L88 36V64" 
      stroke="#DE3151" 
      strokeWidth="12" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Play Button inside the 'C' */}
    <path 
      d="M44 38L54 44L44 50V38Z" 
      fill="#DE3151" 
    />
  </svg>
);

export default Logo;
