const EmbeddedGame = () => {
  return (
    <div className="w-full h-screen overflow-hidden bg-background">
      <iframe 
        src="https://your-game-url.lovableproject.com/" 
        className="w-full h-full border-0"
        style={{
          borderRadius: '8px',
          display: 'block',
          width: '100%',
          height: '100vh',
          border: 'none'
        }}
        title="Embedded Game"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};

export default EmbeddedGame;
