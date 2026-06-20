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

        <button onClick={completeSale}>
          Complete Sale
        </button>

        {/* CALCULATOR */}
        <Calculator />
      </div>
    </div>
  );
}

export default Sales;