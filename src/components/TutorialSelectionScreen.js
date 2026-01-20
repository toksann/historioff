import React from 'react';

const TutorialSelectionScreen = ({ gameData, onStartTutorial, onExit }) => {
    // gameData がなければ何も表示しない
    if (!gameData || !gameData.tutorialMaster) {
        return <div>チュートリアルデータを読み込み中...</div>;
    }

    const tutorials = gameData.tutorialMaster;

    return (
        <div className="deck-selection-screen">
            <div className="screen-header">
                <h1>チュートリアル選択</h1>
                <button onClick={onExit} className="back-button">戻る</button>
            </div>
            <div className="deck-selection-area">
                <div className="deck-grid">
                    {tutorials.map(tutorial => (
                        <div key={tutorial.tutorialId} className="deck-card" onClick={() => onStartTutorial(tutorial.tutorialId)}>
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
