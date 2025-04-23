import React from "react";

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center bg-base-200 p-12">
      <div className="max-w-md text-center">
        {/* Asymmetric pattern with squares of different sizes */}
        <div className="relative h-80 w-80 mx-auto mb-12">
          {/* Small square top left */}
          <div className="absolute left-1/4 top-0 w-12 h-12 bg-primary/10 rounded-lg" />
          
          {/* Medium squares top right */}
          <div className="absolute left-1/2 top-0 w-20 h-20 bg-primary/15 rounded-xl" />
          <div className="absolute left-3/4 top-0 w-20 h-20 bg-primary/15 rounded-xl animate-pulse" />
          
          {/* Large squares center-left column */}
          <div className="absolute left-1/4 top-1/3 w-24 h-24 bg-primary/15 rounded-2xl animate-pulse" />
          <div className="absolute left-1/4 top-2/3 w-24 h-24 bg-primary/15 rounded-2xl" />
          
          {/* Small squares right side grid */}
          <div className="absolute right-0 top-1/2 w-12 h-12 bg-primary/10 rounded-lg" />
          <div className="absolute right-16 top-1/2 w-12 h-12 bg-primary/10 rounded-lg animate-pulse" />
          <div className="absolute right-0 top-[calc(50%+3rem)] w-12 h-12 bg-primary/10 rounded-lg animate-pulse" />
          <div className="absolute right-16 top-[calc(50%+3rem)] w-12 h-12 bg-primary/10 rounded-lg" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;