import React, { useState } from 'react';
import { LightBoard } from './lightboard';  // Make sure path is correct

function AuraLogo({ onClick }) {
  const [isHovered, setIsHovered] = useState(true);  // Initialize to true so it starts static

  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(false)}  // Allow movement on hover
      onMouseLeave={() => setIsHovered(true)}   // Keep static when not hovered
      style={{ 
        width: '120px',
        cursor: 'pointer',
        background: 'transparent'
      }}
    >
      <LightBoard
        rows={7}
        lightSize={3}
        gap={1}
        text="AURA"
        font="default"
        updateInterval={300}  // Speed when moving (only during hover)
        colors={{
          background: "rgba(30, 30, 40, 0.05)",  // Even more subtle background
          textDim: "rgba(63, 81, 181, 0.5)",     // Slightly brighter dim state
          drawLine: "rgba(63, 81, 181, 0.7)",    // Medium primary color
          textBright: "rgba(63, 81, 181, 1)"     // Full opacity for bright state
        }}
        disableDrawing={true}  // Make sure drawing is disabled for logo
        controlledHoverState={isHovered}  // True = static, False = moving
        onHoverStateChange={setIsHovered}
      />
    </div>
  );
}

export default AuraLogo; 