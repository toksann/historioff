import React, { useState, useEffect } from 'react';

const TutorialSelectionScreen = ({ onSelectTutorial, onBack }) => {
    const [tutorials, setTutorials] = useState([]);

    useEffect(() => {
        fetch('/tutorials/tutorial_master.json')
            .then(response => response.json())
            .then(data => setTutorials(data))
            .catch(error => console.error('Error fetching tutorials:', error));
    }, []);

    return (
        <div className="deck-selection-screen">
            <div className="screen-header">
                <h1>チュートリアル選択</h1>
                <button onClick={onBack} className="back-button">戻る</button>
            </div>
            <div className="deck-selection-area">
                <div className="deck-grid">
                    {tutorials.map(tutorial => (
                        <div key={tutorial.id} className="deck-card" onClick={() => onSelectTutorial(tutorial)}>
                            <h3>{tutorial.title}</h3>
                            <p className="deck-description">{tutorial.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TutorialSelectionScreen;
