import React from "react";

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center bg-base-200 p-12">
      <div className="max-w-md text-center">
        {/* Pattern design with strategically placed squares */}
        <div className="relative h-64 w-64 mx-auto mb-12">
          {/* Center square */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-primary/15 rounded-2xl animate-pulse" />
          
          {/* Corner squares */}
          <div className="absolute left-0 top-0 w-20 h-20 bg-primary/15 rounded-2xl animate-pulse" />
          <div className="absolute right-0 top-0 w-20 h-20 bg-primary/15 rounded-2xl" />
          <div className="absolute left-0 bottom-0 w-20 h-20 bg-primary/15 rounded-2xl" />
          <div className="absolute right-0 bottom-0 w-20 h-20 bg-primary/15 rounded-2xl animate-pulse" />
          
          {/* Middle edge squares */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-20 h-20 bg-primary/15 rounded-2xl" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-20 h-20 bg-primary/15 rounded-2xl" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-20 h-20 bg-primary/15 rounded-2xl animate-pulse" />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-20 h-20 bg-primary/15 rounded-2xl animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;