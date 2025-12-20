import React, { useState, useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 50; // A left swipe is detected if dragged more than 50px
const LONG_PRESS_DURATION = 200; // 300ms for a long press to show the hint

const DeckBuilderLibraryCard = ({ card, onTap, onSwipeLeft }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const pressTimeout = useRef(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isSwipe = useRef(false);

  const handlePressStart = useCallback((e) => {
    // Prevent default drag behavior on some browsers
    e.preventDefault();

    startX.current = e.clientX || e.touches[0].clientX;
    currentX.current = startX.current;
    isSwipe.current = false;
    setIsPressed(true);

    // Set a timeout to detect a long press
    pressTimeout.current = setTimeout(() => {
      // Only show hint if the user hasn't started swiping
      const movedX = Math.abs(currentX.current - startX.current);
      if (movedX < 10) {
        setShowHint(true);
      }
    }, LONG_PRESS_DURATION);
  }, []);

  const handlePressMove = useCallback((e) => {
    if (!isPressed) return;

    currentX.current = e.clientX || e.touches[0].clientX;
    const movedX = startX.current - currentX.current;

    // If moved significantly to the left, it's a swipe
    if (movedX > 10) {
        isSwipe.current = true;
        // If a swipe is starting, clear the long-press hint timeout
        clearTimeout(pressTimeout.current);
        setShowHint(false);
    }
  }, [isPressed]);

  const handlePressEnd = useCallback(() => {
    clearTimeout(pressTimeout.current);
    
    const movedX = startX.current - currentX.current;

    if (isPressed) {
      // Check for swipe left
      if (movedX > SWIPE_THRESHOLD) {
        if (onSwipeLeft) {
          onSwipeLeft(card);
        }
      }
      // Check for tap (minimal movement)
      else if (Math.abs(movedX) < 10) {
        if (onTap) {
          onTap(card);
        }
      }
    }

    // Reset all states
    setIsPressed(false);
    setShowHint(false);
    startX.current = 0;
    currentX.current = 0;
    isSwipe.current = false;
  }, [isPressed, card, onTap, onSwipeLeft]);
  
  const handleMouseLeave = useCallback(() => {
    if (isPressed) {
        handlePressEnd();
    }
  }, [isPressed, handlePressEnd]);

  return (
    <div
      className={`deck-builder-library-card card-type-${card.card_type} ${isPressed ? 'pressed' : ''}`}
      onMouseDown={handlePressStart}
      onMouseMove={handlePressMove}
      onMouseUp={handlePressEnd}
      onMouseLeave={handleMouseLeave} // Handle case where mouse leaves the element while pressed
      onTouchStart={handlePressStart}
      onTouchMove={handlePressMove}
      onTouchEnd={handlePressEnd}
      title="クリックでデッキに追加、左フリックで詳細表示"
    >
      {showHint && <div className="card-swipe-hint">← フリックで詳細</div>}
      {card.name} ({card.required_scale})
    </div>
  );
};

export default DeckBuilderLibraryCard;
