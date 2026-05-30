import { useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

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
        <h1>{title}</h1>
        <p>Welcome back, Kalani</p>
      </div>

      <div className="header-actions">
        <input type="text" placeholder="Search..." />
        <button>+ New Sale</button>
      </div>
    </header>
  );
}

export default Header;