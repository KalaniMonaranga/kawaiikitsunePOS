import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
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
      (p) =>
        p.barcode &&
        p.barcode.toLowerCase() === barcode.toLowerCase()
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

      await supabase
        .from("products")
        .update({ quantity: newQty })
        .eq("id", item.id);
    }

    if (customerId) {
      const currentPoints =
        Number(selectedCustomer?.loyalty_points || 0);

      await supabase
        .from("customers")
        .update({
          loyalty_points: currentPoints + loyaltyPoints,
        })
        .eq("id", customerId);
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
    setShowReceiptOptions(true);

    setCart([]);
    setPaidAmount("");
    setCustomerId("");
    setCustomerName("");

    fetchProducts();
    fetchCustomers();
  }

  function printReceipt(receipt) {
    if (!receipt) return;

    const win = window.open("", "_blank");

    const html = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { font-family: Arial; font-size: 12px; padding: 10px; }
            .center { text-align: center; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; font-size: 11px; }
            td { padding: 2px 0; }
            .right { text-align: right; }
          </style>
        </head>

        <body>
          <div class="center">
            <h3>KAWAII KITSUNE</h3>
            <p>Anime Store</p>
          </div>

          <div class="line"></div>

          <div>Bill: ${receipt.billNo}</div>
          <div>Customer: ${receipt.customerName}</div>
          <div>Date: ${receipt.date}</div>

          <div class="line"></div>

          <table>
            ${receipt.cart
              .map(
                (item) => `
                <tr><td colspan="2">${item.name}</td></tr>
                <tr>
                  <td>${item.cartQty} x Rs.${item.selling_price}</td>
                  <td class="right">Rs.${item.cartQty * item.selling_price}</td>
                </tr>
              `
              )
              .join("")}
          </table>

          <div class="line"></div>

          <div>Total: Rs.${receipt.total.toFixed(2)}</div>
          <div>Paid: Rs.${receipt.paid.toFixed(2)}</div>
          <div>Change: Rs.${receipt.change.toFixed(2)}</div>

          <div class="line"></div>

          <div class="center">Thank you 💜</div>

          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          placeholder="Customer name optional"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        <div>
          {cart.map((item) => (
            <div key={item.id}>
              {item.name}
              <input
                type="number"
                value={item.cartQty}
                onChange={(e) =>
                  updateQty(item.id, e.target.value)
                }
              />
              <button onClick={() => removeItem(item.id)}>×</button>
            </div>
          ))}
        </div>

        <div>
          <strong>Total: Rs. {total.toFixed(2)}</strong>
        </div>

        <input
          type="number"
          placeholder="Paid amount"
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
        />

        <div>
          Change: Rs. {change > 0 ? change.toFixed(2) : "0.00"}
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

        <button onClick={completeSale}>
          Complete Sale & Print
        </button>

        {showReceiptOptions && completedSale && (
          <div>
            <button onClick={() => printReceipt(completedSale)}>
              🖨 Print Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sales;