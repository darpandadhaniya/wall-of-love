import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TestimonialCard } from './components/TestimonialCard';
import { projectId, publicAnonKey } from '/utils/supabase/info';
export interface Testimonial {
  id?: string;
  name: string;
  title?: string;
  message: string;
  stars?: number;
  avatar_url?: string;
  source?: string;
}

// Helper to distribute a flat list of testimonials across a given number of columns
const distributeTestimonials = (data: Testimonial[], numColumns: number) => {
  const columns: Testimonial[][] = Array.from({ length: numColumns }, () => []);
  data.forEach((item, index) => {
    columns[index % numColumns].push(item);
  });
  return columns;
};

interface TestimonialColumnProps {
  testimonials: Testimonial[];
  delay: string;
  className?: string;
}

function TestimonialColumn({ testimonials, delay, className = '' }: TestimonialColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (columnRef.current) {
      // The container holds 2 identical sets of cards. One full loop travels exactly half this height.
      const scrollDistance = columnRef.current.offsetHeight / 2;
      // Define a constant speed across all columns and screen sizes (e.g., 30 pixels per second)
      const speedPxPerSec = 30; 
      setDuration(scrollDistance / speedPxPerSec);
    }
  }, [testimonials]);

  return (
    <div className={`w-[320px] shrink-0 h-full relative ${className}`}>
      <div 
        ref={columnRef}
        className="absolute w-full flex flex-col gap-[60px] pb-[60px] hover-pause animate-scroll-up"
        style={{ 
          animationDelay: delay,
          animationDuration: duration ? `${duration}s` : '120s'
        }}
      >
        {/* First set */}
        {testimonials.map((t) => (
          <TestimonialCard key={`orig-${t.id}`} {...t} />
        ))}
        {/* Duplicated set for seamless loop */}
        {testimonials.map((t) => (
          <TestimonialCard key={`dup-${t.id}`} {...t} />
        ))}
      </div>
    </div>
  );
}

import seedData from './data/seed.json';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numColumns, setNumColumns] = useState(1);
  const [testimonialsData, setTestimonialsData] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Auto-seed data if it doesn't exist
  const seedDatabase = async () => {
    try {
      setIsLoading(true);
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-81535eb2/testimonials`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(seedData)
      });
      if (response.ok) {
        // Clear error and trigger re-fetch by updating state instead of a hard reload
        // Since we are in a preview env, maybe reload is causing issues. Let's just update a toggle to force a re-fetch
        setError(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error('Failed to seed database');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to seed the database.');
      setIsLoading(false);
    }
  };

  // Fetch testimonials from the backend
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setIsLoading(true);
        
        if (!projectId || !publicAnonKey) {
          throw new Error("Missing Supabase projectId or publicAnonKey. Please check /utils/supabase/info.tsx");
        }

        const url = `https://${projectId}.supabase.co/functions/v1/make-server-81535eb2/testimonials`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        let dataWithIds: any[] = [];
        if (Array.isArray(data)) {
          // Generate IDs for the incoming data to ensure unique keys
          dataWithIds = data.map((t: any, index: number) => ({ ...t, id: `t-${index}` }));
        } else if (data && typeof data === 'object' && !data.error) {
          // Fallback if data was saved as an object wrapping the array
          const possibleArray = Object.values(data).find(v => Array.isArray(v));
          if (possibleArray) {
            dataWithIds = (possibleArray as any[]).map((t: any, index: number) => ({ ...t, id: `t-${index}` }));
          } else {
            // Just wrap it in an array if it's a single object
            dataWithIds = [{ ...data, id: 't-0' }];
          }
        }

        if (dataWithIds.length > 0) {
          // Multiply the data array to create a continuous scroll effect similar to what you had before
          const multipliedData = [
            ...dataWithIds,
            ...dataWithIds.map((t: any) => ({ ...t, id: `${t.id}-copy1` })),
            ...dataWithIds.map((t: any) => ({ ...t, id: `${t.id}-copy2` })),
            ...dataWithIds.map((t: any) => ({ ...t, id: `${t.id}-copy3` }))
          ];
          setTestimonialsData(multipliedData);
        } else {
          setTestimonialsData([]);
        }
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setError('Failed to load testimonials. They might not be seeded in the database yet.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestimonials();
  }, [refreshTrigger]);

  useEffect(() => {
    const calculateColumns = (width: number) => {
      // Calculate max columns of 320px that can fit with 50px min padding on each side (100px total)
      // plus exactly 80px fixed gap between columns.
      // Formula: columns * 320 + (columns - 1) * 80 <= width - 100
      // => columns * 400 - 80 <= width - 100 => columns <= (width - 20) / 400
      // Cap the maximum number of columns to 5.
      const cols = Math.min(5, Math.max(1, Math.floor((width - 20) / 400)));
      setNumColumns(cols);
    };

    // Initial calculation using window width in case observer misses initial render
    calculateColumns(window.innerWidth);

    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        calculateColumns(entries[0].contentRect.width);
      } else {
        // Fallback to window width if container width is reported as 0
        calculateColumns(window.innerWidth);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    // Fallback resize listener for iframe embeds
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth || window.innerWidth;
        if (width > 0) calculateColumns(width);
      } else {
        calculateColumns(window.innerWidth);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const columnsData = useMemo(() => distributeTestimonials(testimonialsData, numColumns), [numColumns, testimonialsData]);
  
  // Stagger delays for up to 10 potential columns
  const delays = ["0s", "-30s", "-60s", "-90s", "-120s", "-15s", "-45s", "-75s", "-105s", "-135s"];

  if (isLoading) {
    return (
      <div className="w-full h-[650px] bg-[#191919] flex items-center justify-center font-sans">
        <div className="text-[#E0E0E0] text-[18px]">Loading testimonials...</div>
      </div>
    );
  }

  if (error || testimonialsData.length === 0) {
    return (
      <div className="w-full h-[650px] bg-[#191919] flex flex-col gap-4 items-center justify-center font-sans p-6 text-center">
        <div className="text-[#E0E0E0] text-[18px]">
          {error || "No testimonials found. Please insert data into the KV store."}
        </div>
        {testimonialsData.length === 0 && !error && (
          <button 
            onClick={seedDatabase}
            className="px-6 py-2 bg-[#7B7BFF] hover:bg-[#5D5DFF] text-white rounded font-medium transition-colors"
          >
            Seed Database with JSON
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-[650px] bg-[#191919] overflow-hidden group flex justify-center gap-[80px] relative m-0 px-[50px] py-0 border-none box-border"
    >
      {/* Top Gradient Mask */}
      <div className="absolute top-0 left-0 right-0 h-[60px] bg-gradient-to-b from-[#191919] to-transparent z-10 pointer-events-none" />

      {columnsData.map((colData, index) => (
        <TestimonialColumn 
          key={index}
          testimonials={colData} 
          delay={delays[index % delays.length]} 
        />
      ))}

      {/* Bottom Gradient Mask */}
      <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-[#191919] to-transparent z-10 pointer-events-none" />

      <style>{`
        @keyframes scroll-up {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
        
        .animate-scroll-up {
          animation: scroll-up 120s linear infinite;
          height: max-content; 
        }

        /* Hover anywhere on the parent group pauses all columns at once */
        .group:hover .hover-pause {
          animation-play-state: paused !important;
        }
      `}</style>
    </div>
  );
}