import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Quotation() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [products, setProducts] = useState([]);
  const [productSuggestions, setProductSuggestions] = useState([]);

  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  async function loadCustomers() {
    const { data } = await supabase
      .from("customers")
      .select("id,name")
      .order("name", { ascending: true });

    setCustomers(data || []);
  }

  async function loadProducts() {
    const { data } = await supabase
      .from("products")
      .select("id,name,selling_price")
      .eq("is_active", true)
      .order("name", { ascending: true });

    setProducts(data || []);
  }

  // ➕ Add item
  const addItem = () => {
    if (!itemName || !itemPrice) return;

    setItems([
      ...items,
      { name: itemName, price: parseFloat(itemPrice) },
    ]);

    setItemName("");
    setItemPrice("");
    setProductSuggestions([]);
  };

  // ❌ Remove item
  const removeItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  // Suggest products while typing item name
  function onItemNameChange(value) {
    setItemName(value);
    if (!value) {
      setProductSuggestions([]);
      return;
    }

    const matches = products
      .filter((p) => p.name && p.name.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8);

    setProductSuggestions(matches);
  }

  function selectSuggestion(p) {
    setItemName(p.name);
    setItemPrice(String(p.selling_price || ""));
    setProductSuggestions([]);
  }

  function clearItemName() {
    setItemName("");
    setItemPrice("");
    setProductSuggestions([]);
  }

  // 💰 Calculations
  const itemsTotal = items.reduce((sum, i) => sum + i.price, 0);
  const total =
    itemsTotal +
    parseFloat(deliveryCharge || 0) +
    parseFloat(serviceCharge || 0);

  const balance = total - (advance || 0);

  // Export quotation as PDF (opens print dialog in landscape A4)
  function exportQuotationAsPDF() {
    function esc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    const itemsRows = items
      .map(
        (it, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(it.name)}</td>
            <td style="text-align:right">${Number(it.price).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Quotation</title>
          <style>
            :root{--primary:#4a148c;--secondary:#2e0854;--muted:#75667f;--white:#ffffff}
            @page { size: A4 landscape; margin: 18mm; }
            body{font-family: Arial, Helvetica, sans-serif; color:#222; margin:0;}
            .container{width:100%;background:#fff;padding:18px;box-sizing:border-box}
            .header{display:flex;justify-content:space-between;align-items:center}
            .brand{display:flex;align-items:center;gap:12px}
            .brand img{width:64px;height:auto}
            h1{color:var(--primary);margin:0;font-size:20px}
            .meta{text-align:right;color:var(--muted)}
            table{width:100%;border-collapse:collapse;margin-top:16px}
            th,td{padding:8px;border:1px solid #eee}
            th{background:linear-gradient(90deg,var(--secondary),var(--primary));color:var(--white);text-align:left}
            .totals{margin-top:12px;display:flex;justify-content:flex-end;gap:20px}
            .totals .box{min-width:220px;background:#fafafa;padding:12px;border-radius:8px;border:1px solid #f0f0f0}
            .notes{margin-top:12px;padding:10px;border-left:4px solid var(--primary);background:#fbf8ff}
            .footer{margin-top:18px;text-align:center;color:var(--muted);font-size:12px}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand">
                <img src="/logo.png" alt="Logo" />
                <div>
                  <h1>Kawaii Kitsune</h1>
                  <div style="color:var(--muted)">Quotation / Pre-Order</div>
                </div>
              </div>
              <div class="meta">
                <div>Bill: ${esc(new Date().getTime().toString().slice(-6))}</div>
                <div>Date: ${esc(new Date().toLocaleString())}</div>
                ${customerName ? `<div>Customer: ${esc(customerName)}</div>` : ""}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:60px">#</th>
                  <th>Item</th>
                  <th style="width:120px;text-align:right">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="totals">
              <div class="box">
                <div style="display:flex;justify-content:space-between"><strong>Items total</strong><span>Rs. ${itemsTotal.toFixed(2)}</span></div>
                <div style="display:flex;justify-content:space-between"><span>Delivery/Extra</span><span>Rs. ${Number(deliveryCharge || 0).toFixed(2)}</span></div>
                <div style="display:flex;justify-content:space-between"><span>Service</span><span>Rs. ${Number(serviceCharge || 0).toFixed(2)}</span></div>
                <hr />
                <div style="display:flex;justify-content:space-between"><strong>Total</strong><strong>Rs. ${total.toFixed(2)}</strong></div>
                <div style="display:flex;justify-content:space-between"><span>Advance</span><span>Rs. ${Number(advance || 0).toFixed(2)}</span></div>
                <div style="display:flex;justify-content:space-between"><strong>Balance</strong><strong>Rs. ${Number(balance || 0).toFixed(2)}</strong></div>
              </div>
            </div>

            <div class="notes">Notes: ${esc(notes)}</div>

            <div class="footer">Powered by Kawaii Kitsune • Thank you</div>
          </div>
        </body>
      </html>`;

    const pw = window.open("", "_blank", "fullscreen=no,toolbar=no,menubar=no");
    pw.document.open();
    pw.document.write(html);
    pw.document.close();
    setTimeout(() => {
      pw.focus();
      pw.print();
      // keep window open so user can save; close after print dialog
      setTimeout(() => pw.close(), 1000);
    }, 400);
  }

  return (
    <div className="page-content">
      <div className="crud-card">
        <h2 className="page-top">Quotation / Pre-Order</h2>

        <div className="form-row">
          <div style={{ flex: 1 }}>
            <label>Select Customer</label>
            <select
              className="search-input"
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label>Or enter name</label>
            <input
              className="search-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in customer"
            />
          </div>
        </div>

        <div className="panel" style={{ marginTop: 18 }}>
          <h3>Items</h3>

          <div className="form-row">
            <input
              className="search-input"
              placeholder="Item name"
              value={itemName}
              onChange={(e) => onItemNameChange(e.target.value)}
            />
            <button className="btn-light" onClick={clearItemName} style={{ width: 40, marginLeft: 8 }}>×</button>
            <input
              className="search-input"
              placeholder="Price"
              type="number"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
            />
            <button className="btn-light" onClick={addItem}>Add</button>
          </div>

          {productSuggestions.length > 0 && (
            <div className="panel" style={{ marginTop: 8, maxHeight: 220, overflowY: 'auto' }}>
              {productSuggestions.map((p) => (
                <div key={p.id} className="form-row" style={{ cursor: 'pointer' }} onClick={() => selectSuggestion(p)}>
                  <div style={{ flex: 1 }}>{p.name}</div>
                  <div style={{ width: 120, textAlign: 'right' }}>Rs. {Number(p.selling_price || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {items.map((item, index) => (
            <div key={index} className="form-row">
              <div style={{ flex: 1 }}>{item.name}</div>
              <div style={{ width: 120, textAlign: "right" }}>Rs. {item.price.toFixed(2)}</div>
              <button className="btn-delete" onClick={() => removeItem(index)}>Remove</button>
            </div>
          ))}
        </div>

        <div className="form-row" style={{ marginTop: 18 }}>
          <div style={{ flex: 1 }}>
            <h3>Extra Charges</h3>
            <input
              className="search-input"
              type="number"
              placeholder="Delivery charge"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)}
            />
            <input
              className="search-input"
              type="number"
              placeholder="Service charge"
              value={serviceCharge}
              onChange={(e) => setServiceCharge(e.target.value)}
            />
          </div>

          <div style={{ flex: 1 }}>
            <h3>Payment</h3>
            <input
              className="search-input"
              type="number"
              placeholder="Advance paid"
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
            />
          </div>
        </div>

        <div className="panel" style={{ marginTop: 18 }}>
          <h3>Summary</h3>
          <div className="form-row">
            <div>Total:</div>
            <div>Rs. {total.toFixed(2)}</div>
          </div>
          <div className="form-row">
            <div>Advance:</div>
            <div>Rs. {Number(advance || 0).toFixed(2)}</div>
          </div>
          <div className="form-row">
            <div>Balance:</div>
            <div>Rs. {Number(balance || 0).toFixed(2)}</div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 18 }}>
          <h3>Notes</h3>
          <textarea
            className="search-input"
            placeholder="Notes (size, color, delivery details...)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ minHeight: 90 }}
          />
        </div>

        <div className="form-actions" style={{ marginTop: 18 }}>
          <button className="btn-light" onClick={exportQuotationAsPDF}>Save Quotation (PDF)</button>
        </div>
      </div>
    </div>
  );
}

export default Quotation;