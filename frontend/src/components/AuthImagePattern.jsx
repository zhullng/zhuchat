import React from "react";

const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12">
      <div className="max-w-md text-center">
        {/* Padrão em formato de cruz com 5 quadrados principais */}
        <div className="relative w-72 h-72 mx-auto mb-8">
          {/* Quadrado central */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-primary/10 rounded-2xl animate-pulse" />
          
          {/* Quadrado superior */}
          <div className="absolute left-1/2 top-0 transform -translate-x-1/2 w-24 h-24 bg-primary/10 rounded-2xl" />
          
          {/* Quadrado inferior */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 w-24 h-24 bg-primary/10 rounded-2xl animate-pulse" />
          
          {/* Quadrado esquerdo */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-24 h-24 bg-primary/10 rounded-2xl" />
          
          {/* Quadrado direito */}
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-24 h-24 bg-primary/10 rounded-2xl animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-base-content/60">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;