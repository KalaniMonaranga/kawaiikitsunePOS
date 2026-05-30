import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Dashboard() {
  const [todaySales, setTodaySales] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [monthlyProfit, setMonthlyProfit] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);

    const { data: sales } = await supabase.from("sales").select("*");
    const { data: products } = await supabase.from("products").select("*");

    const todayTotal = (sales || [])
      .filter((sale) => sale.created_at?.startsWith(today))
      .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);

    const lowStockCount = (products || []).filter(
      (product) => Number(product.quantity) <= 5
    ).length;

    const monthlySales = (sales || []).filter(
      (sale) => new Date(sale.created_at) >= monthStart
    );

    const monthlyTotal = monthlySales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0
    );

    setTodaySales(todayTotal);
    setProductsCount(products?.length || 0);
    setLowStock(lowStockCount);
    setMonthlyProfit(monthlyTotal);
  }

  const cards = [
    {
      title: "Today Sales",
      value: `Rs. ${todaySales.toFixed(2)}`,
      note: "Total sales made today",
      icon: "💰",
    },
    {
      title: "Products",
      value: productsCount,
      note: "Available shop products",
      icon: "📦",
    },
    {
      title: "Low Stock",
      value: lowStock,
      note: "Products need restocking",
      icon: "⚠️",
    },
    {
      title: "Monthly Sales",
      value: `Rs. ${monthlyProfit.toFixed(2)}`,
      note: "This month total sales",
      icon: "📈",
    },
  ];

  return (
    <div className="dashboard">
      <div className="welcome-card">
        <div>
          <h2>Kawaii Kitsune POS</h2>
          <p>Manage your anime shop sales, products, stock and reports smoothly.</p>
        </div>
      </div>

      <div className="cards-grid">
        {cards.map((card) => (
          <div className="dash-card" key={card.title}>
            <div className="card-icon">{card.icon}</div>
            <h3>{card.title}</h3>
            <h2>{card.value}</h2>
            <p>{card.note}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-row">
        <div className="panel">
          <h3>Recent Sales</h3>
          <p>Sales data will be shown here soon.</p>
        </div>

        <div className="panel">
          <h3>Quick Actions</h3>
          <button>Add Product</button>
          <button>Add Category</button>
          <button>View Reports</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;