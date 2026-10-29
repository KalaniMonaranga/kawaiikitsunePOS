import { useEffect, useState } from "react";
import "./SplashScreen.css";
import logo from "../assets/logo.png";

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      const timer = setTimeout(onFinish, 700);
      return () => clearTimeout(timer);
    }

    const start = Date.now();
    const duration = 3200;
    let finishTimer;

    const interval = setInterval(() => {
      const next = Math.min(
        100,
        Math.round(((Date.now() - start) / duration) * 100)
      );

      setProgress(next);

      if (next >= 100) {
        clearInterval(interval);
        setLeaving(true);
        finishTimer = setTimeout(onFinish, 650);
      }
    }, 40);

    return () => {
      clearInterval(interval);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <main className={`kk-splash ${leaving ? "kk-splash-leaving" : ""}`}>
      <div className="kk-scanlines" aria-hidden="true" />
      <div className="kk-grid" aria-hidden="true" />
      <div className="kk-orb kk-orb-one" aria-hidden="true" />
      <div className="kk-orb kk-orb-two" aria-hidden="true" />

      <div className="kk-sakura" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <span
            key={index}
            style={{
              "--i": index,
              "--fall-duration": `${4 + (index % 5)}s`,
              "--fall-delay": `${index * -0.6}s`,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      <section className="kk-splash-content">
        <div className="kk-logo-ring">
          <img
            src={logo}
            alt="Kawaii Kitsune logo"
            className="kk-splash-logo"
          />
        </div>

        <p className="kk-kicker">SYSTEM INITIALIZATION</p>
        <h1 className="kk-title" data-text="KAWAII KITSUNE">
          KAWAII KITSUNE
        </h1>
        <p className="kk-subtitle">POINT OF SALE SYSTEM</p>

        <div className="kk-loading">
          <div className="kk-loading-label">
            <span>INITIALIZING DEDICATED SYSTEM</span>
            <strong>{progress}%</strong>
          </div>
          <div
            className="kk-progress-track"
            role="progressbar"
            aria-label="Loading"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <p className="kk-tagline">From Japan to Your Heart</p>
        <p className="kk-status">
          <span /> PREPARING YOUR WORKSPACE
        </p>
      </section>

      <span className="kk-corner kk-corner-tl" aria-hidden="true" />
      <span className="kk-corner kk-corner-br" aria-hidden="true" />
    </main>
  );
}
