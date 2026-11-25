import { useEffect, useState } from 'react';

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? window.scrollY / scrollable : 0);
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} />;
}

export function Atmosphere() {
  const particles = Array.from({ length: 12 }, (_, index) => ({
    id: index,
    left: `${(index * 37 + 11) % 100}%`,
    top: `${(index * 53 + 7) % 100}%`,
    size: `${2 + (index % 4)}px`,
    delay: `${(index % 9) * 0.9}s`,
    duration: `${14 + (index % 7) * 3}s`,
  }));

  return (
    <div className="atmosphere" aria-hidden="true">
      <span className="ink-blob blob-one" />
      <span className="ink-blob blob-two" />
      <span className="ink-blob blob-three" />
      <div className="gold-dust">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="gold-particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>
    </div>
  );
}

