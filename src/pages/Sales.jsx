import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import "../styles/Sales.css";

function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [completedSale, setCompletedSale] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    setProducts(data || []);
  }

  async function fetchCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });

    setCustomers(data || []);
  }

  function addToCart(product) {
    if (product.quantity <= 0) {
      alert("This product is out of stock");
      return;
    }

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      if (existing.cartQty + 1 > product.quantity) {
        alert("Not enough stock");
        return;
      }

      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, cartQty: item.cartQty + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, cartQty: 1 }]);
    }
  }

  function handleBarcodeEnter(e) {
    if (e.key !== "Enter") return;

    const product = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()
    );

    if (!product) {
      alert("Product not found");
      return;
    }

    addToCart(product);
    setBarcode("");
  }

  function updateQty(id, qty) {
    const product = products.find((p) => p.id === id);
    const newQty = Number(qty);

    if (newQty < 1) return;

    if (newQty > product.quantity) {
      alert("Not enough stock");
      return;
    }

    setCart(
      cart.map((item) => (item.id === id ? { ...item, cartQty: newQty } : item))
    );
  }

  function removeItem(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  const subtotal = cart.reduce((sum, item) => sum + Number(item.selling_price) * item.cartQty, 0);

  const total = subtotal;
  const paid = Number(paidAmount || 0);
  const change = paid - total;
  const loyaltyPoints = total * 0.02;

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));

  async function completeSale() {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (paid < total) {
      alert("Paid amount is not enough");
      return;
    }

    const billNo = String(Date.now()).slice(-5);

    const finalCustomerName = customerName.trim() || selectedCustomer?.name || "Customer";

    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          bill_no: billNo,
          customer_id: customerId || null,
          customer_name: finalCustomerName,
          subtotal,
          discount: 0,
          total_amount: total,
          paid_amount: paid,
          change_amount: change,
          payment_method: paymentMethod,
          loyalty_points_earned: loyaltyPoints,
        },
      ])
      .select()
      .single();

    if (saleError) {
      alert(saleError.message);
      return;
    }

    const saleItems = cart.map((item) => ({
      sale_id: saleData.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.cartQty,
      unit_price: Number(item.selling_price),
      subtotal: Number(item.selling_price) * item.cartQty,
    }));

    await supabase.from("sale_items").insert(saleItems);

    for (const item of cart) {
      const newQty = Number(item.quantity) - item.cartQty;

      await supabase.from("products").update({ quantity: newQty }).eq("id", item.id);
    }

    if (customerId) {
      const currentPoints = Number(selectedCustomer?.loyalty_points || 0);

      await supabase.from("customers").update({ loyalty_points: currentPoints + loyaltyPoints }).eq("id", customerId);
    }

    const receiptData = {
      billNo,
      customerName: finalCustomerName,
      cart: [...cart],
      total,
      paid,
      change,
      date: new Date().toLocaleString(),
    };

    setCompletedSale(receiptData);

    setCart([]);
    setPaidAmount("");
    setCustomerId("");
    setCustomerName("");

    fetchProducts();
    fetchCustomers();

    setTimeout(() => {
      handlePrint(receiptData);
    }, 0);
  }

  const handlePrint = (saleData) => {
    function esc(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    if (saleData) {
      const itemsHtml = (saleData.cart || [])
        .map((item) => `
          <div class="row item-row">
            <div class="item-name">${esc(item.name)}</div>
            <div class="item-qty">x${item.cartQty}</div>
            <div class="item-price">${(Number(item.selling_price) * item.cartQty).toFixed(2)}</div>
          </div>`)
        .join("");

      const html = `<!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Receipt</title>
            <style>
              body { width:58mm; font-family: monospace; font-size: 12px; margin:0; padding:8px; }
              .center { text-align: center; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .row { display:flex; justify-content:space-between; align-items:center; margin:4px 0; }
              .item-row { display:flex; justify-content:space-between; gap:6px; }
              .item-name { flex:1; word-break:break-word; }
              .item-qty { width:36px; text-align:right; }
              .item-price { width:60px; text-align:right; }
              h4 { margin:6px 0; }
              .small { font-size:11px; }
            </style>
          </head>
          <body>
            <div class="center">
              <img src="/logo.png" alt="Logo" style="width:64px;height:auto;margin:0 auto 6px;display:block" />
              <h4>Kawaii Kitsune</h4>
              <div class="small">POS Receipt</div>
            </div>
            <div class="divider"></div>
            <div class="small">Bill: ${esc(saleData.billNo || "")}</div>
            <div class="small">Date: ${esc(saleData.date || new Date().toLocaleString())}</div>
            ${saleData.customerName ? `<div class="small">Customer: ${esc(saleData.customerName)}</div>` : ""}
            <div class="divider"></div>
            ${itemsHtml}
            <div class="divider"></div>
            <div class="row"><strong>Total</strong><strong>${Number(saleData.total || 0).toFixed(2)}</strong></div>
            <div class="row"><span>Paid</span><span>${Number(saleData.paid || 0).toFixed(2)}</span></div>
            <div class="row"><span>Change</span><span>${Number(saleData.change || 0).toFixed(2)}</span></div>
            <div class="divider"></div>
            <div class="center small">Thank you for your purchase</div>
          </body>
        </html>`;

      const newWindow = window.open("", "", "width=300,height=600");
      newWindow.document.open();
      newWindow.document.write(html);
      newWindow.document.close();

      setTimeout(() => {
        newWindow.focus();
        newWindow.print();
        newWindow.close();
      }, 600);

      return;
    }

    const printContents = document.getElementById("receipt");

    if (!printContents) {
      alert("Receipt not found!");
      return;
    }

    // Fallback: open a printable window with receipt contents
    const newWindow = window.open("", "", "width=300,height=600");
    const html = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { width: 58mm; font-family: monospace; font-size: 12px; margin: 0; padding: 5px; }
            .center { text-align: center; }
            .row { display: flex; justify-content: space-between; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .receipt-logo { width: 48px; height: auto; margin: 0 auto 8px; display: block; }
          </style>
        </head>
        <body>
          ${printContents.innerHTML}
        </body>
      </html>
    `;

    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();

    setTimeout(() => {
      newWindow.print();
      newWindow.close();
    }, 500);
  };

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="sales-container">
      <div className="products-section">
        <input className="search-input" placeholder="Search product..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <input className="search-input" placeholder="Scan barcode..." value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleBarcodeEnter} />

        <div className="product-sale-grid">
          {filteredProducts.map((product) => (
            <div className="sale-product-card" key={product.id} onClick={() => addToCart(product)}>
              <h4>{product.name}</h4>
              <p>Rs. {product.selling_price}</p>
              <span>Stock: {product.quantity}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cart-panel">
        <h3>Current Bill</h3>

        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input className="search-input" placeholder="Customer name optional" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />

        {cart.map((item) => (
          <div key={item.id} className="cart-item-row">
            <div className="cart-item-label">
              <span>{item.name}</span>
              <button className="remove-item-btn" onClick={() => removeItem(item.id)}>×</button>
            </div>
            <input type="number" value={item.cartQty} onChange={(e) => updateQty(item.id, e.target.value)} />
          </div>
        ))}

        <strong>Total: Rs. {total.toFixed(2)}</strong>

        <input className="cash-input" type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />

        <div>Change: Rs. {change > 0 ? change.toFixed(2) : "0.00"}</div>

        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option>Cash</option>
          <option>Card</option>
          <option>Bank Transfer</option>
          <option>QR</option>
        </select>

        <button className="checkout-btn" onClick={completeSale}>Complete Sale</button>
      </div>

      <div id="receipt" style={{ display: "none" }}>
        {completedSale && (
          <div>
            <div className="center">
              <img src="/logo.png" alt="Kawaii Kitsune Logo" className="receipt-logo" />
              <h4>Kawaii Kitsune</h4>
              <p>POS System</p>
              <p>Bill: {completedSale.billNo}</p>
              <p>{completedSale.date}</p>
            </div>

            <div className="divider"></div>

            {completedSale.cart.map((item) => (
              <div className="row" key={item.id}>
                <span>{item.name} x{item.cartQty}</span>
                <span>Rs. {item.cartQty * item.selling_price}</span>
              </div>
            ))}

            <div className="divider"></div>

            <div className="row">
              <strong>Total</strong>
              <strong>Rs. {completedSale.total}</strong>
            </div>

            <div className="row">
              <span>Paid</span>
              <span>Rs. {completedSale.paid}</span>
            </div>

            <div className="row">
              <span>Change</span>
              <span>Rs. {completedSale.change}</span>
            </div>

            <div className="center">
              <p>Thank you!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sales;
                
