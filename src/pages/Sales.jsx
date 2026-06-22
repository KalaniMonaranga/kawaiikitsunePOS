import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import "./Sales.css";

function Sales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calc, setCalc] = useState("");
  const [search, setSearch] = useState("");

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
      <html>
      <body style="font-family:monospace;width:58mm">
        <h3 style="text-align:center">Kawaii Kitsune</h3>
        <hr/>
        ${cart
          .map(
            (i) => `
            <div style="display:flex;justify-content:space-between">
              <span>${i.name} x${i.qty}</span>
              <span>${i.qty * i.price}</span>
            </div>
          `
          )
          .join("")}
        <hr/>
        <div style="display:flex;justify-content:space-between">
          <b>Total</b><b>${total}</b>
        </div>
        <p style="text-align:center">Thank you 💜</p>
      </body>
      </html>
    `);
    w.document.close();
    w.print();
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sales-page">

      {/* LEFT SIDE */}
      <div className="sales-left">

        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search product..."
          className="search-bar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* PRODUCTS */}
        <div className="products-grid">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="product-card"
              onClick={() => addToCart(p)}
            >
              <h4>{p.name}</h4>
              <p>Rs {p.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDE CART */}
      <div className="sales-right">
        <h3>Cart</h3>

        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <span>{item.name} x {item.qty}</span>
            <span>{item.qty * item.price}</span>
          </div>
        ))}

        <hr />

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
          Print
        </button>

        <button
          className="calc-btn"
          onClick={() => setShowCalculator(!showCalculator)}
        >
          🧮
        </button>
      </div>

      {/* CALCULATOR */}
      {showCalculator && (
        <div className="calculator">
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