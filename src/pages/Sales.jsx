import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import jsPDF from "jspdf";

/* ================= CALCULATOR ================= */
function Calculator() {
  const [input, setInput] = useState("");

  function handleClick(val) {
    setInput((prev) => prev + val);
  }

  function calculate() {
    try {
      const result = Function('"use strict";return (' + input + ')')();
      setInput(result.toString());
    } catch {
      setInput("Error");
    }
  }

  function clear() {
    setInput("");
  }

  return (
    <div className="calculator">
      <input value={input} readOnly />

      <div className="buttons">
        {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+"].map((b) => (
          <button key={b} onClick={() => b === "=" ? calculate() : handleClick(b)}>
            {b}
          </button>
        ))}
        <button onClick={clear}>C</button>
      </div>
    </div>
  );
}

/* ================= SALES ================= */
function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);

  const [discount, setDiscount] = useState(0);

  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  }

  async function fetchCustomers() {
    const { data } = await supabase.from("customers").select("*");
    setCustomers(data || []);
  }

  /* ================= CART ================= */

  function addToCart(product) {
    if (product.quantity <= 0) return alert("Out of stock");

    const existing = cart.find((i) => i.id === product.id);

    if (existing) {
      if (existing.cartQty + 1 > product.quantity) {
        return alert("Not enough stock");
      }

      setCart(
        cart.map((i) =>
          i.id === product.id ? { ...i, cartQty: i.cartQty + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...product, cartQty: 1 }]);
    }
  }

  function updateQty(id, qty) {
    const newQty = Number(qty);

    if (newQty < 1) return;

    setCart(
      cart.map((i) =>
        i.id === id ? { ...i, cartQty: newQty } : i
      )
    );
  }

  function removeItem(id) {
    setCart(cart.filter((i) => i.id !== id));
  }

  /* ================= CALCULATIONS ================= */

  const subtotal = cart.reduce(
    (sum, i) => sum + i.cartQty * Number(i.selling_price),
    0
  );

  const total = Math.max(subtotal - Number(discount || 0), 0);
  const paid = Number(paidAmount || 0);
  const change = paid - total;

  const loyaltyPoints = total * 0.02;

  const selectedCustomer = customers.find(
    (c) => String(c.id) === String(customerId)
  );

  function openPrintWindow(saleData, items, meta) {
    try {
      const w = window.open("", "_blank");
      if (!w) return;

      const itemsHtml = items
        .map(
          (it) => `
            <div style="display:flex;justify-content:space-between;font-size:9pt;margin:2px 0">
              <span>${it.name}</span>
              <span>${it.cartQty} x Rs.${Number(it.selling_price).toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:9pt;margin:2px 0 6px 0">
              <span></span>
              <span>Rs.${(it.cartQty * Number(it.selling_price)).toFixed(2)}</span>
            </div>
          `
        )
        .join("");

      const receiptDate = new Date(saleData.created_at);
      const dateStr = receiptDate.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timeStr = receiptDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              width: 58mm;
              padding: 3mm;
              font-size: 10pt;
              line-height: 1.2;
              background: white;
            }
            .receipt { text-align: center; }
            .logo { font-size: 13pt; font-weight: bold; margin: 4px 0 2px; letter-spacing: 1px; }
            .tagline { font-size: 7pt; margin-bottom: 4px; letter-spacing: 0.5px; }
            .separator { border-top: 1px dashed #000; margin: 4px 0; }
            .info { text-align: left; font-size: 9pt; margin: 2px 0; }
            .items { margin: 4px 0; text-align: left; }
            .totals { margin: 4px 0; font-size: 9pt; }
            .total-line { display: flex; justify-content: space-between; margin: 2px 0; }
            .total-row { font-weight: bold; font-size: 10pt; margin: 3px 0; }
            .footer { text-align: center; font-size: 8pt; margin: 6px 0 0; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="logo">🦊 KAWAII KITSUNE 🦊</div>
            <div class="tagline">Anime • Manga • Collectibles</div>
            <div class="separator"></div>
            
            <div class="info">Bill No: ${saleData.bill_no}</div>
            <div class="info">Cashier: Kalani</div>
            <div class="info">Customer: ${meta.customer}</div>
            <div class="info">Date: ${dateStr}, ${timeStr}</div>
            
            <div class="separator"></div>
            <div class="items">${itemsHtml}</div>
            <div class="separator"></div>
            
            <div class="totals">
              <div class="total-line">
                <span>Subtotal</span>
                <span>Rs.${meta.subtotal.toFixed(2)}</span>
              </div>
              ${Number(meta.discount || 0) > 0 ? `<div class="total-line">
                <span>Discount</span>
                <span>-Rs.${Number(meta.discount || 0).toFixed(2)}</span>
              </div>` : ""}
              <div class="total-line total-row">
                <span>Total</span>
                <span>Rs.${meta.total.toFixed(2)}</span>
              </div>
              <div class="total-line">
                <span>Paid</span>
                <span>Rs.${Number(meta.paid || 0).toFixed(2)}</span>
              </div>
              <div class="total-line">
                <span>Change</span>
                <span>Rs.${Number(meta.change || 0).toFixed(2)}</span>
              </div>
            </div>
            
            <div class="separator"></div>
            <div class="footer">Thank you!<br>Come again 🎊</div>
          </div>
        </body>
        </html>
      `;

      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } catch (e) {
      console.error("Print error", e);
    }
  }

  /* ================= COMPLETE SALE ================= */

  async function completeSale() {
    if (cart.length === 0) return alert("Cart empty");
    if (paid < total) return alert("Not enough payment");

    const billNo = String(Date.now()).slice(-5);

    const finalName =
      customerName || selectedCustomer?.name || "Customer";

    const { data: saleData, error } = await supabase
      .from("sales")
      .insert([
        {
          bill_no: billNo,
          customer_id: customerId || null,
          customer_name: finalName,
          subtotal,
          discount,
          total_amount: total,
          paid_amount: paid,
          change_amount: change,
          payment_method: paymentMethod,
          loyalty_points_earned: loyaltyPoints,
        },
      ])
      .select()
      .single();

    if (error) return alert(error.message);

    /* SAVE ITEMS */
    await supabase.from("sale_items").insert(
      cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.cartQty,
        unit_price: item.selling_price,
      }))
    );

    /* UPDATE STOCK */
    for (const item of cart) {
      await supabase
        .from("products")
        .update({
          quantity: item.quantity - item.cartQty,
        })
        .eq("id", item.id);
    }

    /* ✅ FIX LOYALTY POINTS (NO RPC) */
    if (customerId) {
      const current = Number(selectedCustomer?.loyalty_points || 0);

      await supabase
        .from("customers")
        .update({
          loyalty_points: current + loyaltyPoints,
        })
        .eq("id", customerId);
    }

    // Print receipt in a new window (if allowed by browser)
    try {
      openPrintWindow(saleData, cart, {
        customer: finalName,
        subtotal,
        discount,
        total,
        paid,
        change,
        paymentMethod,
      });
    } catch (e) {
      console.error(e);
    }

    alert("Sale Completed!");

    setCart([]);
    setDiscount(0);
    setPaidAmount("");
    setCustomerId("");
    setCustomerName("");

    fetchProducts();
    fetchCustomers();
  }

  /* ================= UI ================= */

  return (
    <div className="sales-layout">

      {/* LEFT */}
      <div className="sales-products">
        <input
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="product-sale-grid">
          {products
            .filter((p) =>
              p.name.toLowerCase().includes(search.toLowerCase())
            )
            .map((product) => (
              <div
                key={product.id}
                className="sale-product-card"
                onClick={() => addToCart(product)}
              >
                <h4>{product.name}</h4>
                <p>Rs. {product.selling_price}</p>
                <span>Stock: {product.quantity}</span>
              </div>
            ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="cart-panel">
        <h3>Billing</h3>

        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Select Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Or enter name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        {/* CART */}
        {cart.map((item) => (
          <div className="cart-item" key={item.id}>
            <strong>{item.name}</strong>

            <input
              type="number"
              value={item.cartQty}
              onChange={(e) => updateQty(item.id, e.target.value)}
            />

            <button onClick={() => removeItem(item.id)}>X</button>
          </div>
        ))}

        {/* DISCOUNT */}
        <input
          type="number"
          placeholder="Discount (Rs)"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />

        <div className="bill-summary">
  <div>
    <span>Subtotal</span>
    <span>Rs. {subtotal.toFixed(2)}</span>
  </div>

  <div className="discount-row">
    <span>Discount</span>
    <span>- Rs. {Number(discount || 0).toFixed(2)}</span>
  </div>

  <div>
    <strong>Total</strong>
    <strong>Rs. {total.toFixed(2)}</strong>
  </div>
</div>

        <input
          type="number"
          placeholder="Paid amount"
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
        />

        <p>Change: Rs. {change > 0 ? change.toFixed(2) : "0.00"}</p>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option>Cash</option>
          <option>Card</option>
          <option>QR</option>
        </select>

        <button className="complete-btn" onClick={completeSale}>
          Complete Sale
        </button>

        <button
          type="button"
          className="calculator-toggle"
          onClick={() => setShowCalculator((prev) => !prev)}
        >
          {showCalculator ? "Hide Calculator" : "Show Calculator"}
        </button>

        {showCalculator && <Calculator />}
      </div>
    </div>
  );
}

export default Sales;