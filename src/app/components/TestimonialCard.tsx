import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface TestimonialCardProps {
  name: string;
  title?: string;
  message: string;
  avatar_url?: string;
  stars?: number;
  source?: string;
}

export function TestimonialCard({
  name,
  title,
  message,
  avatar_url,
  stars = 5,
  source,
}: TestimonialCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Auto-detect if text needs truncation
  const isLongText = message && message.length > 200;

  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '';

  const showFallback = !avatar_url || imgError;

  return (
    <div 
      className="bg-[#1E1E1E] border border-[#333333] rounded-[6px] p-[20px] w-full max-w-[320px] flex flex-col gap-3 font-sans box-border text-left transition-all duration-300 selection:bg-[#FFFF00] selection:text-[#000000]"
      style={{ boxShadow: '4px 4px 0px 0px #FFA500' }}
    >
      {/* Row 1: Header */}
      <div className="flex items-center gap-3">
        {showFallback ? (
          <div className="w-[48px] h-[48px] rounded-full bg-[#5D5DFF] text-[#FFFFFF] flex items-center justify-center text-[16px] font-semibold shrink-0">
            {initials}
          </div>
        ) : (
          <img
            src={avatar_url}
            alt={name}
            onError={() => setImgError(true)}
            className="w-[48px] h-[48px] rounded-full object-cover shrink-0"
          />
        )}
        <div className="flex flex-col justify-center">
          <span className="text-[17px] font-semibold text-[#FFFFFF] leading-tight font-['Open_Sans']">
            {name}
          </span>
          {title && (
            <span className="text-[14px] text-[#A3A3A3] font-normal leading-tight mt-[3px] font-['Open_Sans']">
              {title}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Rating */}
      <div className="flex gap-[2px]">
        {[...Array(stars)].map((_, i) => (
          <Star
            key={i}
            className="w-[15px] h-[15px] text-[#FFA500] fill-[#FFA500]"
            strokeWidth={1}
          />
        ))}
      </div>

      {/* Row 3: Body text */}
      <div className="flex flex-col items-start">
        <p
          className={`text-[15px] text-[#E0E0E0] font-normal font-['Open_Sans'] leading-[1.65] m-0 ${
            isLongText && !isExpanded ? 'line-clamp-5' : ''
          }`}
        >
          {message}
        </p>
        {isLongText && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[14px] text-[#7B7BFF] mt-2 hover:underline focus:outline-none bg-transparent border-none p-0 cursor-pointer font-medium font-['Open_Sans']"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}