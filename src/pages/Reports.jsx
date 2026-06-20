import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import * as XLSX from "xlsx";

function Reports() {
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [chartView, setChartView] = useState("daily");

  useEffect(() => {
    loadReportsData();
  }, []);

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

  const chartData = useMemo(() => {
    const buckets = {};
    const labels = {};

    filteredSales.forEach((sale) => {
      const date = new Date(sale.created_at);
      const amount = Number(sale.total_amount || 0);

      if (chartView === "monthly") {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        buckets[key] = (buckets[key] || 0) + amount;
        labels[key] = date.toLocaleString("default", { month: "short", year: "numeric" });
      } else {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        buckets[key] = (buckets[key] || 0) + amount;
        labels[key] = date.toLocaleDateString("default", { month: "short", day: "numeric" });
      }
    });

    return Object.keys(buckets)
      .sort()
      .map((key) => ({ label: labels[key], value: buckets[key] }));
  }, [filteredSales, chartView]);

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalBills = filteredSales.length;

  const filteredSaleIds = filteredSales.map((sale) => sale.id);

  const filteredSaleItems = saleItems.filter((item) =>
    filteredSaleIds.includes(item.sale_id)
  );

  /* ✅ FIXED PROFIT CALCULATION */
  const profit = filteredSaleItems.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) return sum;

    const selling = Number(item.unit_price || product.selling_price || 0);
    const cost = Number(product.cost_price || 0);

    return sum + (selling - cost) * Number(item.quantity || 0);
  }, 0);

  const lowStockProducts = products.filter(
    (product) => Number(product.quantity || 0) <= 5
  );

  /* ✅ FIXED BEST SELLING */
  const bestSellingProducts = useMemo(() => {
    const map = {};

    saleItems.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);

      if (!map[item.product_id]) {
        map[item.product_id] = {
          product_id: item.product_id,
          product_name: product?.name || "Unknown Product",
          quantity: 0,
          total: 0,
        };
      }

      map[item.product_id].quantity += Number(item.quantity || 0);
      map[item.product_id].total +=
        Number(item.unit_price || 0) * Number(item.quantity || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [saleItems, products]);

  const topCustomers = [...customers]
    .sort(
      (a, b) =>
        Number(b.loyalty_points || 0) -
        Number(a.loyalty_points || 0)
    )
    .slice(0, 5);

  function exportToExcel() {
    // Build 2D array (AOA) so we can control types and layout
    const rows = [];
    // Title row
    rows.push([`Sales Report - ${filter.toUpperCase()}`]);
    rows.push([]); // empty row
    // Header
    rows.push(["Bill No", "Customer", "Total Amount", "Date"]);

    filteredSales.forEach((sale) => {
      rows.push([
        sale.bill_no,
        sale.customer_name || "Customer",
        Number(sale.total_amount || 0),
        new Date(sale.created_at).toLocaleString(),
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 18 },
      { wch: 25 },
    ];

    // Style header row (row index 2 in our sheet)
    try {
      const headerRow = 2;
      for (let c = 0; c < 4; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c });
        const cell = worksheet[cellAddress];
        if (cell) {
          cell.s = {
            font: { bold: true, color: { rgb: "FFFFFFFF" } },
            fill: { fgColor: { rgb: "FF6F42C1" } },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }
      }

      // Format total amount column as number with two decimals
      const startRow = headerRow + 1;
      const endRow = rows.length - 1;
      for (let r = startRow; r <= endRow; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: 2 });
        const cell = worksheet[addr];
        if (cell) {
          cell.t = "n";
          cell.z = "#,##0.00";
        }
      }
    } catch (e) {
      // If styling not supported in environment, silently continue
      console.warn("XLSX styling not fully supported:", e);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    XLSX.writeFile(workbook, `Sales-Report-${filter}.xlsx`);
  }

  async function deleteSale(sale) {
    if (!sale || !sale.id) return;

    const pwd = window.prompt("Enter your login password to confirm deletion:");
    if (pwd === null) return; // user cancelled

    // Re-authenticate current user with provided password (use same flow as login)
    try {
      const { data: currentUserData } = await supabase.auth.getUser();
      const currentEmail = currentUserData?.user?.email;

      if (!currentEmail) return alert("No authenticated user found. Please login first.");

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: pwd,
      });

      if (authErr) {
        return alert("Incorrect password");
      }

      if (!window.confirm(`Delete sale ${sale.bill_no}? This will remove totals and restock items.`)) return;
    } catch (e) {
      console.error(e);
      return alert("Authentication failed. Cannot delete sale.");
    }

    try {
      // Fetch sale items
      const { data: items, error: itemsErr } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id);

      if (itemsErr) throw itemsErr;

      // Restock products
      for (const it of items || []) {
        // fetch current product
        const { data: prodData, error: prodErr } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", it.product_id)
          .single();

        if (prodErr) {
          console.warn("Product fetch failed for restock", it.product_id, prodErr);
          continue;
        }

        const newQty = Number(prodData.quantity || 0) + Number(it.quantity || 0);

        await supabase
          .from("products")
          .update({ quantity: newQty })
          .eq("id", it.product_id);
      }

      // If sale had loyalty points, subtract from customer
      if (sale.customer_id && Number(sale.loyalty_points_earned || 0) > 0) {
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .select("loyalty_points")
          .eq("id", sale.customer_id)
          .single();

        if (!custErr && cust) {
          const updated = Math.max(0, Number(cust.loyalty_points || 0) - Number(sale.loyalty_points_earned || 0));
          await supabase.from("customers").update({ loyalty_points: updated }).eq("id", sale.customer_id);
        }
      }

      // Delete sale items
      await supabase.from("sale_items").delete().eq("sale_id", sale.id);

      // Delete sale
      await supabase.from("sales").delete().eq("id", sale.id);

      alert("Sale deleted and inventory restored.");
      loadReportsData();
    } catch (e) {
      console.error(e);
      alert("Failed to delete sale. See console for details.");
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Reports</h2>
        <button onClick={exportToExcel}>Export Excel</button>
      </div>

      {/* FILTER */}
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
          Month
        </button>
      </div>

      {/* CARDS */}
      <div className="report-cards">
        <div className="report-card">
          <h3>Total Sales</h3>
          <h2>Rs. {totalSales.toFixed(2)}</h2>
        </div>

        <div className="report-card">
          <h3>Total Bills</h3>
          <h2>{totalBills}</h2>
        </div>

        {/* ✅ CHANGED WORD */}
        <div className="report-card">
          <h3>Profit</h3>
          <h2>Rs. {profit.toFixed(2)}</h2>
        </div>

        <div className="report-card">
          <h3>Low Stock</h3>
          <h2>{lowStockProducts.length}</h2>
          <small>
            {lowStockProducts.slice(0, 3).map(p => p.name).join(", ")}
          </small>
        </div>
      </div>

      <div className="report-panel">
        <div className="report-panel-header">
          <h3>Sales Bar Chart</h3>
          <div className="report-chart-controls">
            <button
              className={chartView === "daily" ? "active" : ""}
              onClick={() => setChartView("daily")}
            >
              Daily
            </button>
            <button
              className={chartView === "monthly" ? "active" : ""}
              onClick={() => setChartView("monthly")}
            >
              Monthly
            </button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="sales-bar-chart">
            {chartData.map((item) => {
              const maxValue = Math.max(...chartData.map((row) => row.value), 1);
              const width = (item.value / maxValue) * 100;

              return (
                <div key={item.label} className="sales-bar-row">
                  <span className="bar-label">{item.label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${width}%` }} />
                  </div>
                  <span className="bar-value">Rs. {item.value.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="chart-empty">No sales data available for this view.</p>
        )}
      </div>

      {/* BEST SELLING */}
      <div className="report-panel">
        <h3>Best Selling Products</h3>

        {bestSellingProducts.map((item, i) => (
          <div key={i} className="report-list-item">
            <strong>{item.product_name}</strong>
            <span>{item.quantity} sold</span>
          </div>
        ))}
      </div>

      {/* SALES LIST (with delete) */}
      <div className="report-panel">
        <h3>Sales List</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={s.id}>
                  <td>{s.bill_no}</td>
                  <td>{s.customer_name || "Customer"}</td>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                  <td>Rs. {Number(s.total_amount || 0).toFixed(2)}</td>
                  <td>
                    <button className="btn-delete" onClick={() => deleteSale(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOW STOCK LIST */}
      <div className="report-panel">
        <h3>Low Stock Products</h3>

        {lowStockProducts.map((product) => (
          <div key={product.id} className="report-list-item">
            <strong>{product.name}</strong>
            <span style={{ color: product.quantity <= 2 ? "red" : "orange" }}>
              {product.quantity} left
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Reports;