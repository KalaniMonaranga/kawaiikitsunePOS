import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import "./Sales.css";

function Sales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calc, setCalc] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase.from("products").select("*");
    setProducts(data || []);
  }

  function addToCart(product) {
    const exist = cart.find((i) => i.id === product.id);

    if (exist) {
      setCart(
        cart.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const total = subtotal - discount;

  function handleCalc(val) {
    if (val === "C") return setCalc("");
    if (val === "=") {
      try {
        setCalc(eval(calc).toString());
      } catch {
        setCalc("Error");
      }
      return;
    }
    setCalc(calc + val);
  }

  function printReceipt() {
    const w = window.open("", "", "width=300,height=600");
    w.document.write(`
    <html><body style="font-family:monospace;width:58mm">
    <h3 style="text-align:center">Kawaii Kitsune</h3>
    <hr/>
    ${cart
      .map(
        (i) => `
        <div>${i.name}</div>
        <div style="display:flex;justify-content:space-between">
          <span>${i.qty} x ${i.price}</span>
          <span>${i.qty * i.price}</span>
        </div>`
      )
      .join("")}
    <hr/>
    <div style="display:flex;justify-content:space-between">
      <b>Total</b><b>${total}</b>
    </div>
    <p style="text-align:center">Thank you 💜</p>
    </body></html>
    `);
    w.document.close();
    w.print();
  }

  return (
    <div className="sales-layout">
      
      {/* PRODUCTS */}
      <div className="products-grid">
        {products.map((p) => (
          <div
            key={p.id}
            className="product-card"
            onClick={() => addToCart(p)}
          >
            <h4>{p.name}</h4>
            <p>{p.price}</p>
          </div>
        ))}
      </div>

      {/* CART PANEL */}
      <div className="cart-panel">
        <h3>Cart</h3>

        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <span>{item.name} x {item.qty}</span>
            <span>{item.qty * item.price}</span>
          </div>
        ))}

        <div className="divider"></div>

        <div>Subtotal: {subtotal}</div>

        <div className="discount">
          Discount:
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </div>

        <h2>Total: {total}</h2>

        <button className="checkout-btn" onClick={printReceipt}>
          Checkout & Print
        </button>

        <button
          className="calc-toggle"
          onClick={() => setShowCalculator(!showCalculator)}
        >
          🧮
        </button>
      </div>

      {/* FLOATING CALCULATOR */}
      {showCalculator && (
        <div className="calculator-float">
          <input value={calc} readOnly />

          <div className="calc-grid">
            {["7","8","9","/","4","5","6","*","1","2","3","-","0",".","=","+","C"]
              .map((b) => (
                <button key={b} onClick={() => handleCalc(b)}>
                  {b}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;