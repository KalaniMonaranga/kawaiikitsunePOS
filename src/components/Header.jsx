import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import logo from "../assets/logo.png";

function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  const pageTitles = {
    "/": "Dashboard",
    "/sales": "Sales",
    "/products": "Products",
    "/categories": "Categories",
    "/customers": "Customers",
    "/expenses": "Expenses",
    "/reports": "Reports",
  };

  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <header className="header">
      <div>
        <img src={logo} alt="Kawaii Kitsune Logo" className="header-logo" />
        <h1>{title}</h1>
        <p>Welcome back, Kalani</p>
      </div>

      <div className="header-actions">
        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

        <button onClick={() => navigate("/sales") }>
          + New Sale
        </button>
      </div>
    </header>
  );
}

export default Header;