import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import logo from "../assets/logo.png";
import jsPDF from "jspdf";

function Sales() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [completedSale, setCompletedSale] = useState(null);
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  
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

  function printReceiptFromCompletedSale() {
  if (!completedSale) return;

  const receiptWindow = window.open("", "_blank");

  receiptWindow.document.write(`
    <html>
      <head>
        <title>Receipt</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }

          html,
          body {
            width: 58mm;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #000;
          }

          .receipt {
            width: 58mm;
            padding: 4mm;
            box-sizing: border-box;
          }

          .center {
            text-align: center;
          }

          .logo {
            width: 90px;
            height: 90px;
            object-fit: contain;
            margin-bottom: 4px;
          }

          .line {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          td {
            padding: 2px 0;
            vertical-align: top;
          }

          .right {
            text-align: right;
          }

          .bold {
            font-weight: bold;
          }

          .total-row {
            font-size: 12px;
            font-weight: bold;
          }
        </style>
      </head>

      <body>
        <div class="receipt">
          <div class="center">
            <img src="${logo}" class="logo" />
            <div class="bold">KAWAII KITSUNE</div>
            <div>Anime • Manga • Collectibles</div>
          </div>

          <div class="line"></div>

          <div>Bill No: ${completedSale.billNo}</div>
          <div>Cashier: Kalani</div>
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
                    <td>${item.cartQty} x Rs.${Number(item.selling_price).toFixed(2)}</td>
                    <td class="right">Rs.${(
                      Number(item.selling_price) * Number(item.cartQty)
                    ).toFixed(2)}</td>
                  </tr>
                `
              )
              .join("")}
          </table>

          <div class="line"></div>

          <table>
            <tr class="total-row">
              <td>Total</td>
              <td class="right">Rs.${Number(completedSale.total).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Paid</td>
              <td class="right">Rs.${Number(completedSale.paid).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Change</td>
              <td class="right">Rs.${Number(completedSale.change).toFixed(2)}</td>
            </tr>
          </table>

          <div class="line"></div>

          <div class="center">
            Thank you!<br/>
            Come again 💜
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);

  receiptWindow.document.close();
}
  
  function downloadPDF() {
  if (!completedSale) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [58, 120],
  });

  doc.setFontSize(11);
  doc.text("KAWAII KITSUNE", 29, 10, { align: "center" });

  doc.setFontSize(8);
  doc.text("Anime • Manga • Collectibles", 29, 15, { align: "center" });

  doc.line(3, 19, 55, 19);

  doc.setFontSize(7);
  doc.text(`Bill No: ${completedSale.billNo}`, 4, 24);
  doc.text(`Cashier: Kalani`, 4, 28);
  doc.text(`Customer: ${completedSale.customerName}`, 4, 32);
  doc.text(`Date: ${completedSale.date}`, 4, 36);

  doc.line(3, 40, 55, 40);

  let y = 45;

  completedSale.cart.forEach((item) => {
    doc.text(item.name, 4, y);
    y += 4;
    doc.text(
      `${item.cartQty} x Rs.${item.selling_price}`,
      4,
      y
    );
    doc.text(
      `Rs.${Number(item.selling_price) * item.cartQty}`,
      55,
      y,
      { align: "right" }
    );
    y += 6;
  });

  doc.line(3, y, 55, y);
  y += 5;

  doc.setFontSize(8);
  doc.text("Total", 4, y);
  doc.text(`Rs.${completedSale.total.toFixed(2)}`, 55, y, { align: "right" });

  y += 5;
  doc.text("Paid", 4, y);
  doc.text(`Rs.${completedSale.paid.toFixed(2)}`, 55, y, { align: "right" });

  y += 5;
  doc.text("Change", 4, y);
  doc.text(`Rs.${completedSale.change.toFixed(2)}`, 55, y, { align: "right" });

  y += 10;
  doc.text("Thank you!", 29, y, { align: "center" });
  y += 4;
  doc.text("Come again!", 29, y, { align: "center" });

  doc.save(`Bill-${completedSale.billNo}.pdf`);
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

      <button
        onClick={() => printReceiptFromCompletedSale()}
            >
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