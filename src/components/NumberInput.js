import React, { useState } from 'react';
import '../App.css';

const NumberInput = ({ prompt, min, max, onConfirm }) => {
    const [value, setValue] = useState(min);

    const handleIncrement = () => {
        setValue(prev => Math.min(max, prev + 1));
    };

    const handleDecrement = () => {
        setValue(prev => Math.max(min, prev - 1));
    };

    const handleChange = (e) => {
        const num = parseInt(e.target.value, 10);
        if (isNaN(num)) {
            setValue(min);
        } else {
            setValue(Math.max(min, Math.min(max, num)));
        }
    };

    const handleConfirm = () => {
        onConfirm(value);
    };

    return (
        <div className="choice-prompt-overlay">
            <div className="choice-prompt">
                <h3>{prompt}</h3>
                <div className="number-input-container">
                    <button onClick={handleDecrement}>-</button>
                    <input 
                        type="number" 
                        value={value} 
                        onChange={handleChange} 
                        min={min} 
                        max={max} 
                    />
                    <button onClick={handleIncrement}>+</button>
                </div>
                <button onClick={handleConfirm} className="confirm-button">
                    確定
                </button>
            </div>
        </div>
    );
};

export default NumberInput;
