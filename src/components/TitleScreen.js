import React, { useState } from 'react';
import InfoModal from './overlays/InfoModal.js';

const ASCII_ART_TITLE = `
                                              s                               ..
    .uef^"          oe           .           :8                              888B.     .n~~%x.
  :d88E           .@88           E          .88           u.      .u    .   48888E   x88X   888.
  \`888E       ==*88888        .x+E:..      :888ooo  ...ue888b   .d88B :@c   '8888'  X888X   88888X
   888E .z8k     88888      u8~  E  \`b.  -*8888888  888R Y888r ="8888f8888r  Y88F  X8888X   88888f
   888E  888E    88888     88N.  E'8888~   8888     888R I888>   4888>        4    88888X   88888
   888E  888E    88888     88888b&.\`""\`    8888     888R I888>   4888>        4    88888X   8888"
   888E  888E    88888     '88888888e.    .8888Lu= u8888cJ888   .d888L .+     .    48888X   8888"
   888E  888E    88888       "*8888888N   ^%888*    "*888*P"    ^"8888*"     u8N.   ?888X   8888"
  m888N= 888>    88888      uu. ^8*8888E    'Y"       'Y"          "Y"      "*88%    "88X   88*\`
   \`Y"   888 '**%%%%%%**   @888L E   98~                                      ""       ^"==="\`
        J88"              '8888~ E  .*"
        @%                 \`*.   E  .*"
      :"                     \`~==R=~\`
`;

const TitleScreen = ({ onScreenChange, onShowRules, onShowCredits, onShowChangelog, version }) => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const disclaimerMessage = `本作品は、歴史上の思想、政治、経済的出来事をテーマにしたフィクションであり、実在の人物、団体、国家、宗教、および現在進行中のいかなる政治的事象とも一切関係ありません。

特定の政治的思想や宗教的信念を支持、推奨、または批判することを目的としたものではなく、またそれらへの勧誘や宣伝を目的としたものでもありません。

ゲーム内の表現やデータは、あくまでゲーム体験の提供と歴史的テーマのエンターテインメントとしての側面を重視したものであり、学術的な正確性や客観性を保証するものではありません。`;

  return (
    <div className="title-screen">
      <div className="title-bg-animation"></div>
      <div className="title-scanline"></div>
      
      <div className="title-content">
        <div className="ascii-art no-select">
          <pre>{ASCII_ART_TITLE}</pre>
        </div>
        
        <div className="title-sub-info">
          <div className="version-info">
            <button className="version-button" onClick={onShowChangelog}>
              SYSTEM v{version}
            </button>
          </div>
        </div>
        
        <div className="menu-options">
          <button 
            className="menu-button start-button"
            onClick={() => onScreenChange('deckSelection')}
          >
            <span className="button-glitch"></span>
            検証開始
          </button>
          
          <button 
            className="menu-button"
            onClick={() => onScreenChange('deckBuilder')}
          >
            運命構築
          </button>
          
          <button 
            className="menu-button"
            onClick={() => onScreenChange('cardLibrary')}
          >
            歴史の断片
          </button>

          <button 
            className="menu-button"
            onClick={onShowRules}
          >
            世の理
          </button>
          
          <button 
            className="menu-button credits-button"
            onClick={onShowCredits}
          >
            開発道具等
          </button>
        </div>
      </div>

      <footer className="title-footer">
        <div className="footer-content">
          <div className="footer-top-row">
            <button className="disclaimer-button" onClick={() => setShowDisclaimer(true)}>
              免責事項
            </button>
          </div>
          <div className="footer-bottom-row">
            <div className="copyright">
              &copy; 2025 - {new Date().getFullYear()} toksann HISTORIO. All Rights Reserved.
            </div>
          </div>
        </div>
      </footer>

      <InfoModal 
        isOpen={showDisclaimer} 
        onClose={() => setShowDisclaimer(false)} 
        title="【免責事項】"
        message={disclaimerMessage}
      />
    </div>
  );
};

export default TitleScreen;