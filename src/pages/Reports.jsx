import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import * as XLSX from "xlsx";

function Reports() {
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("all");

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

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalBills = filteredSales.length;

  const filteredSaleIds = filteredSales.map((sale) => sale.id);

const filteredSaleItems = saleItems.filter((item) =>
  filteredSaleIds.includes(item.sale_id)
);

const dailyProfit = filteredSaleItems.reduce((sum, item) => {
  const product = products.find((p) => p.id === item.product_id);

  if (!product) return sum;

  const profitPerItem =
    Number(product.selling_price || 0) - Number(product.cost_price || 0);

  return sum + profitPerItem * Number(item.quantity || 0);
}, 0);

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
    
  function exportToExcel() {
  const reportData = filteredSales.map((sale) => ({
    "Bill No": sale.bill_no,
    Customer: sale.customer_name || "Customer",
    "Total Amount": Number(sale.total_amount || 0),
    "Paid Amount": Number(sale.paid_amount || 0),
    "Change Amount": Number(sale.change_amount || 0),
    "Payment Method": sale.payment_method || "-",
    Date: new Date(sale.created_at).toLocaleString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(reportData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

  XLSX.writeFile(workbook, `Kawaii-Kitsune-Sales-Report-${filter}.xlsx`);
}

  function printReport() {
    window.print();
  }

  return (
    <div className="reports-page">
      <div className="page-top">
        <div>
          <h2>Reports</h2>
          <p>View sales, customers, stock and product performance.</p>
        </div>

        <button className="report-print-btn" onClick={exportToExcel}>
          Export Excel
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
        <h3>Daily Profit</h3>
        <h2>Rs. {dailyProfit.toFixed(2)}</h2>
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