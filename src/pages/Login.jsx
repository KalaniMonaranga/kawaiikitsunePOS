import { useState } from "react";
import { supabase } from "../services/supabase";
import loginBackground from "../assets/login-cyberpunk-bg.png.png";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      window.location.reload();
    } catch {
      alert("Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="kk-login-page"
      style={{ "--kk-login-background": `url("${loginBackground}")` }}
    >
      <div className="kk-login-grid" aria-hidden="true" />
      <div className="kk-login-particles" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} style={{ "--particle": index }}>✦</span>
        ))}
      </div>

      <section className="kk-login-layout">
        <div className="kk-login-brand">
          <span className="kk-brand-kicker">WELCOME TO YOUR ANIME WORLD</span>
          <h1>Kawaii Kitsune</h1>
          <h2>POINT OF SALE SYSTEM</h2>
          <p>From Japan to Your Heart</p>
          <div className="kk-brand-line" />
          <span className="kk-brand-caption">
            YOUR SHOP. YOUR COLLECTION. YOUR WORLD.
          </span>
        </div>

        <div className="kk-glass-card">
          <div className="kk-glass-logo">
            <img src="/logo.png" alt="Kawaii Kitsune logo" />
          </div>

          <div className="kk-login-heading">
            <span>SECURE ACCESS</span>
            <h2>Welcome Back!</h2>
            <p>Sign in to continue to your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="kk-login-form">
            <label htmlFor="kk-email">Email address</label>
            <input
              id="kk-email"
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label htmlFor="kk-password">Password</label>
            <input
              id="kk-password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="kk-login-spinner" />
                  Signing in...
                </>
              ) : (
                <>Login <span aria-hidden="true">↗</span></>
              )}
            </button>
          </form>

          <div className="kk-login-footer">
            <span className="kk-footer-dot" />
            Your connection is protected
          </div>
        </div>
      </section>

      <div className="kk-login-bottom">
        <span>KAWAII KITSUNE POS</span>
        <span>POWERED BY YOUR PASSION FOR ANIME</span>
      </div>
    </main>
  );
}

export default Login;
