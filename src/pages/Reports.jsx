import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";
import * as XLSX from "xlsx";

function Reports() {
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
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

  function parseSaleDate(createdAt) {
    const date = new Date(createdAt);
    if (!Number.isNaN(date.getTime())) return date;

    if (typeof createdAt === "string") {
      const fixed = createdAt.trim().replace(" ", "T") + "Z";
      const parsed = new Date(fixed);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    return new Date();
  }

  const filteredSales = useMemo(() => {
    const now = new Date();

    return sales.filter((sale) => {
      const date = parseSaleDate(sale.created_at);

      // A selected date/month overrides the quick filters.
      if (selectedDate) {
        const [year, month, day] = selectedDate.split("-").map(Number);
        return (
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
        );
      }

      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-").map(Number);
        return date.getFullYear() === year && date.getMonth() === month - 1;
      }

      if (filter === "all") return true;

      if (filter === "today") {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      }

      if (filter === "week") {
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(now.getDate() - 6);
        return date >= startOfWeek && date <= now;
      }

      if (filter === "month") {
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [sales, filter, selectedDate, selectedMonth]);

  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0
  );

  const totalBills = filteredSales.length;

  const totalProfit = useMemo(() => {
    const productMap = products.reduce((map, product) => {
      map[String(product.id)] = product;
      return map;
    }, {});

    const filteredSaleIds = new Set(
      filteredSales.map((sale) => String(sale.id))
    );

    return saleItems.reduce((sum, item) => {
      if (!filteredSaleIds.has(String(item.sale_id))) return sum;

      const product = productMap[String(item.product_id)];
      const costPrice = Number(
        item.cost_price ??
        item.purchase_price ??
        product?.cost_price ??
        product?.purchase_price ??
        0
      );
      const quantity = Number(item.quantity || 0);

      const storedUnitPrice =
        item.unit_price ??
        item.selling_price ??
        item.price ??
        item.price_each;

      const unitPrice = storedUnitPrice != null
        ? Number(storedUnitPrice)
        : Number(item.subtotal ?? item.total ?? 0) / (quantity || 1);

      return sum + (unitPrice - costPrice) * quantity;
    }, 0);
  }, [saleItems, products, filteredSales]);

  const lowStockProducts = products.filter(
    (product) => Number(product.quantity || 0) < 2
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

  function exportReportAsExcel() {
    const exportSales = [...filteredSales].sort(
      (a, b) =>
        parseSaleDate(a.created_at).getTime() -
        parseSaleDate(b.created_at).getTime()
    );

    if (exportSales.length === 0) {
      alert("No sales available to export.");
      return;
    }

    const saleItemsBySale = saleItems.reduce((map, item) => {
      const saleId = String(item.sale_id);

      if (!map[saleId]) map[saleId] = [];
      map[saleId].push(item.product_name || "Unknown Item");

      return map;
    }, {});

    const rows = exportSales.map((sale) => ({
      "Bill No": sale.bill_no ?? "",
      Customer: sale.customer_name || "Customer",
      "Item Names": (saleItemsBySale[String(sale.id)] || []).join(" | "),
      Total: Number(sale.total_amount || 0),
      Date: new Date(sale.created_at).toLocaleDateString("en-GB"),
      Status: sale.payment_method || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Set readable column widths.
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 52 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
    ];

    // Format the header, currency and date cells.
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];

      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "482080" } },
          alignment: { vertical: "center" },
        };
      }
    }

    for (let row = 1; row <= range.e.r; row++) {
      const totalCell = worksheet[`D${row + 1}`];
      const dateCell = worksheet[`E${row + 1}`];

      if (totalCell) {
        totalCell.z = '"Rs. "#,##0.00';
      }

      if (dateCell) {
        dateCell.t = "s";
        dateCell.v = new Date(
          exportSales[row - 1].created_at
        ).toLocaleDateString("en-GB");
        dateCell.z = "@";
      }

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[
          XLSX.utils.encode_cell({ r: row, c: col })
        ];

        if (cell) {
          cell.s = {
            fill: {
              fgColor: {
                rgb: row % 2 === 0 ? "F3ECFA" : "FFFFFF",
              },
            },
            alignment: {
              vertical: "center",
              wrapText: col === 2,
            },
          };
        }
      }
    }

    worksheet["!autofilter"] = { ref: worksheet["!ref"] };
    worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    worksheet["!rows"] = [{ hpt: 26 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");

    const periodLabel = selectedDate || selectedMonth || filter;
    const fileName =
      `Kawaii-Kitsune-Report-${periodLabel}-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  }

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

    const deleteId = Number(saleId);
    if (Number.isNaN(deleteId)) {
      alert("Invalid bill identifier.");
      return;
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select("*")
      .eq("id", deleteId)
      .single();

    if (saleError || !sale) {
      console.error("Sale lookup failed:", saleError);
      alert("Bill not found.");
      return;
    }

    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", deleteId);

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
      .eq("sale_id", deleteId);

    if (deleteItemsError) {
      alert(deleteItemsError.message);
      return;
    }

    const { error: deleteSaleError } = await supabase
      .from("sales")
      .delete()
      .eq("id", deleteId);

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

        <div className="report-actions">
          <button className="report-print-btn" onClick={printReport}>
            Print Report
          </button>
          <button className="report-export-btn" onClick={exportReportAsExcel}>
            Export Excel
          </button>
        </div>
      </div>

      <div className="report-filter">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => {
            setFilter("all");
            setSelectedDate("");
            setSelectedMonth("");
          }}
        >
          All
        </button>

        <button
          className={filter === "today" ? "active" : ""}
          onClick={() => {
            setFilter("today");
            setSelectedDate("");
            setSelectedMonth("");
          }}
        >
          Daily
        </button>

        <button
          className={filter === "week" ? "active" : ""}
          onClick={() => {
            setFilter("week");
            setSelectedDate("");
            setSelectedMonth("");
          }}
        >
          Weekly
        </button>

        <button
          className={filter === "month" ? "active" : ""}
          onClick={() => {
            setFilter("month");
            setSelectedDate("");
            setSelectedMonth("");
          }}
        >
          Monthly
        </button>
      </div>

      <div
        className="report-filter"
        style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}
      >
        <label>
          Select date{" "}
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              if (event.target.value) setSelectedMonth("");
            }}
            aria-label="Select a date for sales reports"
          />
        </label>

        <label>
          Select month{" "}
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              if (event.target.value) setSelectedDate("");
            }}
            aria-label="Select a month for sales reports"
          />
        </label>

        {(selectedDate || selectedMonth) && (
          <button
            type="button"
            onClick={() => {
              setSelectedDate("");
              setSelectedMonth("");
            }}
          >
            Clear date selection
          </button>
        )}
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
          <h3>Profit</h3>
          <h2>Rs. {totalProfit.toFixed(2)}</h2>
        </div>

        <div className="report-card">
          <h3>Low Stock Items</h3>
          <h2>{lowStockProducts.length}</h2>
        </div>
      </div>

      <div className="reports-grid">
        <div className="report-panel" style={{ maxHeight: "420px", overflowY: "auto" }}>
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
                  {filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>{sale.bill_no}</td>
                      <td>{sale.customer_name || "Customer"}</td>
                      <td>Rs. {Number(sale.total_amount || 0).toFixed(2)}</td>
                      <td>{parseSaleDate(sale.created_at).toLocaleDateString()}</td>
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

        <div className="report-panel" style={{ maxHeight: "420px", overflowY: "auto" }}>
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

        <div className="report-panel" style={{ maxHeight: "420px", overflowY: "auto" }}>
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

        <div className="report-panel" style={{ maxHeight: "420px", overflowY: "auto" }}>
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