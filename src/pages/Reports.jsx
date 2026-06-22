import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

function Reports() {
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    loadReportsData();
    loadUserEmail();
  }, []);

  async function loadUserEmail() {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.email) {
      setUserEmail(data.user.email);
    }
  }

  async function loadReportsData() {
    const { data: salesData } = await supabase
      .from("sales")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: saleItemsData } = await supabase
      .from("sale_items")
      .select("*");

    const { data: productsData } = await supabase
      .from("products")
      .select("*");

    const { data: customersData } = await supabase
      .from("customers")
      .select("*");

    setSales(salesData || []);
    setSaleItems(saleItemsData || []);
    setProducts(productsData || []);
    setCustomers(customersData || []);
  }

  function isInFilter(dateText) {
    if (filter === "all") return true;

    const date = new Date(dateText);
    const now = new Date();

    if (filter === "today") {
      return date.toDateString() === now.toDateString();
    }

    if (filter === "month") {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }

    return true;
  }

  const filteredSales = useMemo(
    () => sales.filter((sale) => isInFilter(sale.created_at)),
    [sales, filter]
  );

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalBills = filteredSales.length;

  const averageBill =
    totalBills > 0 ? totalSales / totalBills : 0;

  const lowStockProducts = products.filter(
    (product) => Number(product.quantity || 0) <= 5
  );

  const bestSellingProducts = useMemo(() => {
    const map = {};

    saleItems.forEach((item) => {
      if (!map[item.product_id]) {
        map[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name || "Unknown Product",
          quantity: 0,
          total: 0,
        };
      }

      map[item.product_id].quantity += Number(item.quantity || 0);
      map[item.product_id].total += Number(item.subtotal || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [saleItems]);

  const topCustomers = [...customers]
    .sort(
      (a, b) =>
        Number(b.loyalty_points || 0) -
        Number(a.loyalty_points || 0)
    )
    .slice(0, 5);

  function printReport() {
    window.print();
  }

  async function handleDeleteBill(saleId) {
    if (!userEmail) {
      alert("Unable to verify your account. Please login again.");
      return;
    }

    if (!window.confirm("Delete this bill and restore stock/points?")) {
      return;
    }

    const password = prompt("Enter your login password to delete this bill:");
    if (!password) return;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (authError || !authData?.user) {
      alert("Incorrect password. Bill deletion is protected.");
      return;
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select("*")
      .eq("id", saleId)
      .single();

    if (saleError || !sale) {
      console.error("Sale lookup failed:", saleError);
      alert("Bill not found.");
      return;
    }

    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", saleId);

    if (itemsError) {
      console.error("Sale items lookup failed:", itemsError);
      alert("Unable to load sale items.");
      return;
    }

    for (const item of saleItems || []) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("quantity")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        continue;
      }

      const currentQty = Number(productData?.quantity || 0);
      const restoreQty = Number(item.quantity || 0);

      await supabase
        .from("products")
        .update({ quantity: currentQty + restoreQty })
        .eq("id", item.product_id);
    }

    if (sale.customer_id) {
      const customer = customers.find((c) => c.id === sale.customer_id);
      if (customer) {
        const pointsToRemove = Number(sale.loyalty_points_earned || 0);
        await supabase
          .from("customers")
          .update({
            loyalty_points: Math.max(
              0,
              Number(customer.loyalty_points || 0) - pointsToRemove
            ),
          })
          .eq("id", customer.id);
      }
    }

    const { error: deleteItemsError } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", saleId);

    if (deleteItemsError) {
      alert(deleteItemsError.message);
      return;
    }

    const { error: deleteSaleError } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleId);

    if (deleteSaleError) {
      alert(deleteSaleError.message);
      return;
    }

    loadReportsData();
  }

  return (
    <div className="reports-page">
      <div className="page-top">
        <div>
          <h2>Reports</h2>
          <p>View sales, customers, stock and product performance.</p>
        </div>

        <button className="report-print-btn" onClick={printReport}>
          Print Report
        </button>
      </div>

      <div className="report-filter">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All
        </button>

        <button
          className={filter === "today" ? "active" : ""}
          onClick={() => setFilter("today")}
        >
          Today
        </button>

        <button
          className={filter === "month" ? "active" : ""}
          onClick={() => setFilter("month")}
        >
          This Month
        </button>
      </div>

      <div className="report-cards">
        <div className="report-card">
          <h3>Total Sales</h3>
          <h2>Rs. {totalSales.toFixed(2)}</h2>
        </div>

        <div className="report-card">
          <h3>Total Bills</h3>
          <h2>{totalBills}</h2>
        </div>

        <div className="report-card">
          <h3>Average Bill</h3>
          <h2>Rs. {averageBill.toFixed(2)}</h2>
        </div>

        <div className="report-card">
          <h3>Low Stock Items</h3>
          <h2>{lowStockProducts.length}</h2>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-panel">
          <h3>Recent Sales</h3>

          {filteredSales.length === 0 ? (
            <p>No sales found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bill No</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSales.slice(0, 10).map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.bill_no}</td>
                      <td>{sale.customer_name || "Customer"}</td>
                      <td>Rs. {Number(sale.total_amount || 0).toFixed(2)}</td>
                      <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteBill(sale.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="report-panel">
          <h3>Best Selling Products</h3>

          {bestSellingProducts.length === 0 ? (
            <p>No product sales yet.</p>
          ) : (
            <div className="report-list">
              {bestSellingProducts.map((item, index) => (
                <div className="report-list-item" key={item.product_id}>
                  <div>
                    <strong>
                      #{index + 1} {item.product_name}
                    </strong>
                    <p>Qty Sold: {item.quantity}</p>
                  </div>
                  <span>Rs. {item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-panel">
          <h3>Top Loyal Customers</h3>

          {topCustomers.length === 0 ? (
            <p>No customer data yet.</p>
          ) : (
            <div className="report-list">
              {topCustomers.map((customer, index) => (
                <div className="report-list-item" key={customer.id}>
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

        <div className="report-panel">
          <h3>Low Stock Products</h3>

          {lowStockProducts.length === 0 ? (
            <p>No low stock products.</p>
          ) : (
            <div className="report-list">
              {lowStockProducts.map((product) => (
                <div className="report-list-item" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <p>Barcode: {product.barcode || "-"}</p>
                  </div>
                  <span>{product.quantity} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;