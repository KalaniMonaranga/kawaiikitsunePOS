import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Sales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcValue, setCalcValue] = useState("");

  // LOAD PRODUCTS
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  }

  // ADD TO CART
  function addToCart(product) {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  }

  // TOTAL
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const total = subtotal - Number(discount || 0);

  // SAVE SALE
  async function handleCheckout() {
    if (cart.length === 0) return alert("Cart is empty");

    const { data: sale } = await supabase
      .from("sales")
      .insert([{ total }])
      .select()
      .single();

    const items = cart.map((item) => ({
      sale_id: sale.id,
      product_id: item.id,
      qty: item.qty,
      price: item.price,
    }));

    await supabase.from("sale_items").insert(items);

    // Loyalty points (1 point per 100)
    const points = Math.floor(total / 100);

    console.log("Points Earned:", points);

    alert("Sale completed!");

    printReceipt();

    setCart([]);
    setDiscount(0);
  }

  // 🧾 PRINT RECEIPT (58mm)
  function printReceipt() {
    const printWindow = window.open("", "", "width=300,height=600");

    printWindow.document.write(`
      <html>
      <head>
        <style>
          body {
            font-family: monospace;
            width: 58mm;
            padding: 5px;
          }
          h2, p {
            text-align: center;
            margin: 2px 0;
          }
          hr {
            border-top: 1px dashed black;
          }
          .row {
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>

        <h2>My Shop</h2>
        <p>Thank you!</p>
        <hr/>

        ${cart
          .map(
            (item) => `
          <div>
            <div>${item.name}</div>
            <div class="row">
              <span>${item.qty} x ${item.price}</span>
              <span>${item.qty * item.price}</span>
            </div>
          </div>
        `
          )
          .join("")}

        <hr/>

        <div class="row">
          <strong>Subtotal</strong>
          <span>${subtotal}</span>
        </div>

        <div class="row">
          <strong>Discount</strong>
          <span>${discount}</span>
        </div>

        <div class="row">
          <strong>Total</strong>
          <span>${total}</span>
        </div>

        <hr/>
        <p>Powered by Kalani 💙</p>

      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
  }

  // CALCULATOR
  function handleCalcClick(value) {
    if (value === "C") {
      setCalcValue("");
    } else if (value === "=") {
      try {
        setCalcValue(eval(calcValue).toString());
      } catch {
        setCalcValue("Error");
      }
    } else {
      setCalcValue(calcValue + value);
    }
  }

  return (
    <div className="sales-container">

      <h2>Sales</h2>

      {/* PRODUCTS */}
      <div className="products">
        {products.map((p) => (
          <button key={p.id} onClick={() => addToCart(p)}>
            {p.name} - {p.price}
          </button>
        ))}
      </div>

      {/* CART */}
      <div className="cart">
        <h3>Cart</h3>

        {cart.map((item) => (
          <div key={item.id}>
            {item.name} x {item.qty} = {item.qty * item.price}
          </div>
        ))}

        <hr />

        <div>Subtotal: {subtotal}</div>

        {/* DISCOUNT */}
        <div>
          Discount:
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>

        <h3>Total: {total}</h3>

        <button onClick={handleCheckout}>Checkout</button>
      </div>

      {/* CALCULATOR */}
      <button onClick={() => setShowCalculator(!showCalculator)}>
        Toggle Calculator
      </button>

      {showCalculator && (
        <div className="calculator">
          <input value={calcValue} readOnly />

          <div className="calc-buttons">
            {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"]
              .map((btn) => (
                <button key={btn} onClick={() => handleCalcClick(btn)}>
                  {btn}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;