
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

const TitleScreen = ({ onMenuSelect }) => {
  return (
    <div className="title-screen">
      <div className="title-content">
        <div className="ascii-art">
          <pre>{ASCII_ART_TITLE}</pre>
        </div>
        
        <div className="menu-options">
          <button 
            className="menu-button"
            onClick={() => onMenuSelect('start')}
          >
            ゲーム開始
          </button>
          
          <button 
            className="menu-button"
            onClick={() => onMenuSelect('rules')}
          >
            ルール
          </button>
          
          <button 
            className="menu-button"
            onClick={() => onMenuSelect('cardLibrary')}
          >
            カード
          </button>
          
          <button 
            className="menu-button"
            onClick={() => onMenuSelect('credits')}
          >
            開発ツール等
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleScreen;