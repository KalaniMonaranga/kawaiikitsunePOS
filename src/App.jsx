
import { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./services/supabase";
import Reports from "./pages/Reports";
import Quotation from "./pages/Quotation";

import Layout from "./components/Layout";
import SplashScreen from "./components/SplashScreen";
import Login from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [splashFinished, setSplashFinished] = useState(false);

  const finishSplash = useCallback(() => {
    setSplashFinished(true);
  }, []);

  async function getSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await getSession();
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Automatically log out after one hour of inactivity.
  useEffect(() => {
    if (!session) return;

    const INACTIVITY_LIMIT = 60 * 60 * 1000;
    const LAST_ACTIVITY_KEY = "kawaii_pos_last_activity";

    let timeout;

    const signOutForInactivity = async () => {
      await supabase.auth.signOut();
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    };

    const resetInactivityTimer = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());

      clearTimeout(timeout);

      timeout = setTimeout(() => {
        signOutForInactivity();
      }, INACTIVITY_LIMIT);
    };

    // Check whether the previous session was inactive for an hour.
    const lastActivity = Number(
      localStorage.getItem(LAST_ACTIVITY_KEY)
    );

    if (
      lastActivity &&
      Date.now() - lastActivity >= INACTIVITY_LIMIT
    ) {
      signOutForInactivity();
      return;
    }

    resetInactivityTimer();

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    const handleStorage = (event) => {
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        clearTimeout(timeout);

        const elapsed = Date.now() - Number(event.newValue);
        const remaining = INACTIVITY_LIMIT - elapsed;

        if (remaining <= 0) {
          signOutForInactivity();
        } else {
          timeout = setTimeout(
            signOutForInactivity,
            remaining
          );
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      clearTimeout(timeout);

      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });

      window.removeEventListener("storage", handleStorage);
    };
  }, [session]);

  if (loading || !splashFinished) {
    return <SplashScreen onFinish={finishSplash} />;
  }

  if (!session) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/quotation" element={<Quotation />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
