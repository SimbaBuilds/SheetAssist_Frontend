import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] opacity-10">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500" />
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 2 + 1}rem`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          >
            {['✏️', '📚', '🔬', '🎨', '🧮', '🌍', '🎭', '🏀', '🎵', '💻'][i % 10]}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Background;