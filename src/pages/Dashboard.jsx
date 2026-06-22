import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Dashboard() {
  const [todaySales, setTodaySales] = useState(0);
  const [productsCount, setProductsCount] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [monthlySalesAmount, setMonthlySalesAmount] = useState(0);
  const [recentSales, setRecentSales] = useState([]);
  const [loyalCustomers, setLoyalCustomers] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const today = new Date().toISOString().split("T")[0];

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: sales } = await supabase.from("sales").select("*");
    const { data: products } = await supabase.from("products").select("*");

    const { data: customers } = await supabase
      .from("customers")
      .select("*")
      .order("loyalty_points", { ascending: false })
      .limit(5);

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

    const latestSales = (sales || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    setTodaySales(todayTotal);
    setProductsCount(products?.length || 0);
    setLowStock(lowStockCount);
    setMonthlySalesAmount(monthlyTotal);
    setRecentSales(latestSales);
    setLoyalCustomers(customers || []);
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
      value: `Rs. ${monthlySalesAmount.toFixed(2)}`,
      note: "This month total sales",
      icon: "📈",
    },
  ];

  return (
    <div className="dashboard">
      <div className="welcome-card">
        <div>
          <h2>Kawaii Kitsune POS</h2>
          <p>
            Manage your anime shop sales, products, stock and reports smoothly.
          </p>
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

          {recentSales.length === 0 ? (
            <p>No recent sales yet.</p>
          ) : (
            <div className="recent-sales-list">
              {recentSales.map((sale) => (
                <div className="recent-sale-item" key={sale.id}>
                  <div>
                    <strong>Bill #{sale.bill_no}</strong>
                    <p>{sale.customer_name || "Customer"}</p>
                  </div>

                  <div className="recent-sale-right">
                    <strong>
                      Rs. {Number(sale.total_amount || 0).toFixed(2)}
                    </strong>
                    <p>{new Date(sale.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Most Loyal Customers</h3>

          {loyalCustomers.length === 0 ? (
            <p>No loyal customers yet.</p>
          ) : (
            <div className="loyal-list">
              {loyalCustomers.map((customer, index) => (
                <div className="loyal-item" key={customer.id}>
                  <div>
                    <strong>
                      #{index + 1} {customer.name}
                    </strong>
                    <p>{customer.phone || "No phone"}</p>
                  </div>

                  <span>
                    {Number(customer.loyalty_points || 0).toFixed(2)} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;