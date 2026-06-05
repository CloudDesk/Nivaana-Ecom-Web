import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BannerItem } from '../types';

interface BannerProps {
  items: BannerItem[];
}

const Banner: React.FC<BannerProps> = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState<boolean[]>(new Array(items.length).fill(false));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [items.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  };

  const handleImageLoad = (index: number) => {
    setImageLoaded(prev => {
      const newLoaded = [...prev];
      newLoaded[index] = true;
      return newLoaded;
    });
  };

  const arrowClass =
    "absolute top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#dedede] bg-white text-[#7a7a7a] shadow-[0_8px_22px_rgba(17,24,39,0.08)] transition duration-200 hover:border-[#cfcfcf] hover:bg-white hover:text-[#565656] hover:shadow-[0_10px_26px_rgba(17,24,39,0.12)]";

  return (
    <div className="relative w-full h-96 md:h-[500px] lg:h-[600px] overflow-hidden">
      {/* Banner Images */}
      <div className="relative w-full h-full">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Image */}
            <div
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ 
                backgroundImage: `url(${item.image})`,
                backgroundPosition: 'center center',
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'scroll'
              }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/50"></div>
            </div>
            
            {/* Loading placeholder */}
            {!imageLoaded[index] && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
                <div className="text-white/50">Loading...</div>
              </div>
            )}
            
            {/* Hidden image for preloading */}
            <img
              src={item.image}
              alt=""
              className="hidden"
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageLoad(index)}
            />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center text-white px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-primary-gold drop-shadow-2xl">
            {items[currentIndex]?.title}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-8 text-white/95 drop-shadow-lg max-w-3xl mx-auto leading-relaxed">
            {items[currentIndex]?.subtitle}
          </p>
          <Link
            to={items[currentIndex]?.ctaLink || '/products'}
            className="inline-block bg-primary-gold text-primary-blue font-semibold px-8 py-4 rounded-lg text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 hover:bg-primary-gold/90"
          >
            {items[currentIndex]?.ctaText}
          </Link>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className={`${arrowClass} left-2 sm:left-4`}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5 stroke-[2.4]" />
      </button>
      <button
        onClick={goToNext}
        className={`${arrowClass} right-2 sm:right-4`}
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5 stroke-[2.4]" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentIndex ? 'bg-primary-gold shadow-lg scale-110' : 'bg-white/60 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Banner;
