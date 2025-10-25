const EmbeddedGame = () => {
  return (
    <div className="w-full h-screen overflow-hidden bg-background">
      <iframe 
        src="https://yourgame.lovable.app" 
        className="w-full h-full border-0"
        style={{
          borderRadius: '0px',
          display: 'block',
          width: '100%',
          height: '100vh',
          border: 'none'
        }}
        title="Embedded Game"
        allow="fullscreen"
      />
    </div>
  );
};

export default EmbeddedGame;
