import logo from "../assets/logo.png";
import { NavLink } from "react-router-dom";

function Sidebar() {
  const menuItems = [
  { name: "Dashboard", path: "/" },
  { name: "Sales", path: "/sales" },
  { name: "Products", path: "/products" },
  { name: "Categories", path: "/categories" },
  { name: "Customers", path: "/customers" },
];

  return (
    <aside className="sidebar">
      <div className="logo-box">
        <img src={logo} alt="Kawaii Kitsune Logo" />
        <h2>Kawaii Kitsune</h2>
        <p>POS System</p>
      </div>

      <nav className="menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "menu-item active" : "menu-item"
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;