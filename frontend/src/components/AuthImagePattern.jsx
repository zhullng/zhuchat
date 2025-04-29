import React from "react";

const AuthImagePattern = ({ title, subtitle }) => {
  // Animation delay values for each square in the grid
  const animationDelays = [
    "0s",    "0.1s", "0.2s",
    "0.3s",  "0.4s", "0.3s",
    "0.2s",  "0.1s", "0s"
  ];

  // Custom colors with different opacity levels
  const bgColors = [
    "bg-primary/20", "bg-primary/10", "bg-primary/20",
    "bg-primary/10", "bg-primary/30", "bg-primary/10",
    "bg-primary/20", "bg-primary/10", "bg-primary/20"
  ];

  return (
    <div className="hidden lg:flex items-center justify-center bg-base-200 p-12">
      <div className="flex flex-col items-center max-w-sm w-full">
        {/* Grid de padrões com largura fixa equivalente ao texto */}
        <div className="grid grid-cols-3 gap-3 mb-8 w-full">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-2xl ${bgColors[i]} animate-pulse`}
              style={{ 
                animationDelay: animationDelays[i],
                animationDuration: "2s"
              }}
            />
          ))}
        </div>
        
        {/* Texto também com largura total para alinhar perfeitamente com o grid */}
        <div className="text-center w-full">
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
          <p className="text-base-content/60">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthImagePattern;