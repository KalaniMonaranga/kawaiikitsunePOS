import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import logo from "../assets/logo.png";
import jsPDF from "jspdf";

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
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);

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
      cart.map((item) =>
        item.id === id ? { ...item, cartQty: newQty } : item
      )
    );
  }

  function removeItem(id) {
    setCart(cart.filter((item) => item.id !== id));
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.selling_price) * item.cartQty,
    0
  );

  const total = subtotal;
  const paid = Number(paidAmount || 0);
  const change = paid - total;
  const loyaltyPoints = total * 0.02;

  const selectedCustomer = customers.find(
    (customer) => String(customer.id) === String(customerId)
  );

  async function completeSale() {
    console.log(completedSale);
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (paid < total) {
      alert("Paid amount is not enough");
      return;
    }

    const billNo = String(Date.now()).slice(-5);

    const finalCustomerName =
      customerName.trim() ||
      selectedCustomer?.name ||
      "Customer";

    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          bill_no: billNo,
          customer_id: customerId || null,
          customer_name: finalCustomerName,
          subtotal: subtotal,
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

    const { error: itemError } = await supabase
      .from("sale_items")
      .insert(saleItems);

    if (itemError) {
      alert(itemError.message);
      return;
    }

    for (const item of cart) {
      const newQty = Number(item.quantity) - item.cartQty;

      await supabase
        .from("products")
        .update({ quantity: newQty })
        .eq("id", item.id);
    }

    if (customerId) {
      const currentPoints = Number(selectedCustomer?.loyalty_points || 0);

      await supabase
        .from("customers")
        .update({
          loyalty_points: currentPoints + loyaltyPoints,
        })
        .eq("id", customerId);
    }

    setCompletedSale({
  billNo,
  customerName: finalCustomerName,
  cart: [...cart],
  total,
  paid,
  change,
  date: new Date().toLocaleString(),
});

setShowReceiptOptions(true);

setCart([]);
    setPaidAmount("");
    setCustomerId("");
    setCustomerName("");
    fetchProducts();
    fetchCustomers();
  }

function printReceipt() {
  if (!completedSale) return;

  const win = window.open("", "ReceiptWindow");
  if (!win) {
    alert("Unable to open print window. Please allow popups for this site.");
    return;
  }

  const html = `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Receipt</title>
      <style>
        body {
          width: 220px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          padding: 10px;
          margin: 0;
        }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; font-size: 11px; border-collapse: collapse; }
        td { padding: 2px 0; vertical-align: top; }
        .right { text-align: right; }
      </style>
    </head>

    <body>
      <div class="center">
        <h3 style="margin: 0;">KAWAII KITSUNE</h3>
        <p style="margin: 4px 0 0;">Anime Store</p>
      </div>

      <div class="line"></div>

      <div>Bill: ${completedSale.billNo}</div>
      <div>Customer: ${completedSale.customerName}</div>
      <div>Date: ${completedSale.date}</div>

      <div class="line"></div>

      <table>
        ${completedSale.cart
          .map(
            (item) => `
              <tr>
                <td colspan="2">${item.name}</td>
              </tr>
              <tr>
                <td>${item.cartQty} x ${item.selling_price}</td>
                <td class="right">Rs.${(item.cartQty * item.selling_price).toFixed(2)}</td>
              </tr>
            `
          )
          .join("")}
      </table>

      <div class="line"></div>

      <div>Total: Rs.${completedSale.total.toFixed(2)}</div>
      <div>Paid: Rs.${completedSale.paid.toFixed(2)}</div>
      <div>Change: Rs.${completedSale.change.toFixed(2)}</div>

      <div class="line"></div>

      <div class="center">Thank you 💜</div>
    </body>
  </html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sales-page">
      <div className="page-top">
        <div>
          <h2>Sales / Billing</h2>
          <p>Create bills, scan items and print receipts.</p>
        </div>
      </div>

      <div className="sales-layout">
        <div className="sales-products">
          <div className="sales-search-row">
            <input
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <input
              placeholder="Scan barcode..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={handleBarcodeEnter}
            />
          </div>

          <div className="product-sale-grid">
            {filteredProducts.map((product) => (
              <div
                className="sale-product-card"
                key={product.id}
                onClick={() => addToCart(product)}
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} />
                ) : (
                  <div className="sale-placeholder">🦊</div>
                )}

                <h4>{product.name}</h4>
                <p>Rs. {product.selling_price}</p>
                <span>Stock: {product.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-panel">
          <h3>Current Bill</h3>

          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Customer name optional"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="empty-cart">No items added.</p>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p>Rs. {item.selling_price}</p>
                  </div>

                  <input
                    type="number"
                    value={item.cartQty}
                    onChange={(e) => updateQty(item.id, e.target.value)}
                  />

                  <button onClick={() => removeItem(item.id)}>×</button>
                </div>
              ))
            )}
          </div>

          <div className="bill-summary">
            <div>
              <span>Total</span>
              <strong>Rs. {total.toFixed(2)}</strong>
            </div>

            <input
              type="number"
              placeholder="Customer paid amount"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />

            <div>
              <span>Change</span>
              <strong>Rs. {change > 0 ? change.toFixed(2) : "0.00"}</strong>
            </div>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Cash</option>
              <option>Card</option>
              <option>Bank Transfer</option>
              <option>QR</option>
            </select>

            <button onClick={completeSale}>Complete Sale & Print</button>
          </div>
        </div>
      </div>
      {showReceiptOptions && completedSale && (
  <div className="receipt-modal">
    <div className="receipt-box">
      <h2>Sale Completed!</h2>
      <p>Bill No: {completedSale.billNo}</p>
      <p>Total: Rs. {completedSale.total.toFixed(2)}</p>

      <button onClick={printReceipt}>
        🖨 Print Receipt
      </button>

      <button onClick={downloadPDF}>
        📄 Download PDF
      </button>

      <button onClick={() => alert("Email system will be added after Vercel setup")}>
        📧 Email Receipt
      </button>

      <button
        className="btn-light"
        onClick={() => setShowReceiptOptions(false)}
      >
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
}

export default Sales;