import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import JsBarcode from "jsbarcode";

function Products() {
  const emptyForm = {
    name: "",
    category_id: "",
    barcode: "",
    cost_price: "",
    selling_price: "",
    quantity: "",
    description: "",
    image_url: "",
    is_active: true,
  };

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  async function fetchCategories() {
    const { data, error } = await supabase.from("categories").select("*");

    if (error) {
      console.error("Failed to load categories:", error);
      return;
    }

    setCategories(data || []);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*, categories(name)")
      .order("id", { ascending: true });

    if (error) {
      console.error("Failed to load products:", error);
      return;
    }

    const loadedProducts = data || [];
    const usedBarcodes = new Set(
      loadedProducts.map((product) => String(product.barcode || "").trim()).filter(Boolean)
    );

    // Assign and save a barcode once for older products that don't have one.
    for (const product of loadedProducts) {
      if (String(product.barcode || "").trim()) continue;

      const barcode = createUniqueBarcode(usedBarcodes);
      const { error: barcodeError } = await supabase
        .from("products")
        .update({ barcode })
        .eq("id", product.id);

      if (barcodeError) {
        console.error(`Could not assign a barcode to ${product.name}:`, barcodeError);
        continue;
      }

      product.barcode = barcode;
      usedBarcodes.add(barcode);
    }

    setProducts([...loadedProducts]);
  }

  function createUniqueBarcode(usedBarcodes) {
    let barcode;

    do {
      const timePart = Date.now().toString().slice(-8);
      const randomPart = Math.floor(1000 + Math.random() * 9000).toString();
      barcode = `KK${timePart}${randomPart}`;
    } while (usedBarcodes.has(barcode));

    usedBarcodes.add(barcode);
    return barcode;
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function uploadImage() {
    // If no new file was selected, keep the current image when editing.
    if (!imageFile) return form.image_url || null;

    if (!imageFile.type.startsWith("image/")) {
      throw new Error("Please select a valid image file.");
    }

    // Use a unique, storage-safe filename to avoid upload collisions.
    const originalName = imageFile.name.split(/[\\/]/).pop() || "product-image";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type,
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    if (!data?.publicUrl) {
      throw new Error("The image uploaded, but Supabase did not return a public URL.");
    }

    return data.publicUrl;
  }

  async function checkDuplicate(barcodeToCheck = "") {
    const { data: sameName, error: nameError } = await supabase
      .from("products")
      .select("id, name")
      .ilike("name", form.name.trim());

    if (nameError) {
      alert(`Could not check duplicate product names: ${nameError.message}`);
      return true;
    }

    const duplicateName = sameName?.find(
      (item) => String(item.id) !== String(editId)
    );

    if (duplicateName) {
      alert("This product name already exists");
      return true;
    }

    if (barcodeToCheck) {
      const { data: sameBarcode, error: barcodeError } = await supabase
        .from("products")
        .select("id, barcode")
        .eq("barcode", barcodeToCheck);

      if (barcodeError) {
        alert(`Could not check duplicate barcodes: ${barcodeError.message}`);
        return true;
      }

      const duplicateBarcode = sameBarcode?.find(
        (item) => String(item.id) !== String(editId)
      );

      if (duplicateBarcode) {
        alert("This barcode already belongs to another product");
        return true;
      }
    }

    return false;
  }

  async function saveProduct() {
    console.log("Save button clicked");
    console.log("Form data:", form);
    console.log("Image file:", imageFile);

    if (
      !form.name ||
      !form.category_id ||
      !form.cost_price ||
      !form.selling_price ||
      !form.quantity
    ) {
      alert("Please fill required fields");
      return;
    }

    // Existing product barcodes are permanent. Generate one only if missing.
    let barcodeToSave = String(form.barcode || "").trim();

    if (editId) {
      const existingProduct = products.find(
        (product) => String(product.id) === String(editId)
      );
      if (existingProduct?.barcode) barcodeToSave = existingProduct.barcode;
    }

    if (!barcodeToSave) {
      const usedBarcodes = new Set(
        products.map((product) => String(product.barcode || "").trim()).filter(Boolean)
      );
      barcodeToSave = createUniqueBarcode(usedBarcodes);
    }

    const isDuplicate = await checkDuplicate(barcodeToSave);
    if (isDuplicate) return;

    let uploadedImageUrl;

    try {
      // Stop saving if the selected image fails to upload.
      uploadedImageUrl = await uploadImage();
    } catch (error) {
      console.error("Product image upload failed:", error);
      alert(error.message || "Image upload failed. The product was not saved.");
      return;
    }

    const productData = {
      name: form.name.trim(),
      category_id: Number(form.category_id),
      barcode: barcodeToSave,
      cost_price: Number(form.cost_price),
      selling_price: Number(form.selling_price),
      quantity: Number(form.quantity),
      description: form.description.trim() || null,
      image_url: uploadedImageUrl,
      is_active: form.is_active,
    };

    if (editId) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editId);

      if (error) return alert(error.message);
      alert("Product updated successfully");
    } else {
      const { error } = await supabase.from("products").insert([productData]);

      if (error) return alert(error.message);
      alert("Product saved successfully");
    }

    setForm(emptyForm);
    setImageFile(null);
    setEditId(null);
    fetchProducts();
  }

  function editProduct(product) {
    setEditId(product.id);
    setForm({
      name: product.name || "",
      category_id: product.category_id || "",
      barcode: product.barcode || "",
      cost_price: product.cost_price || "",
      selling_price: product.selling_price || "",
      quantity: product.quantity || "",
      description: product.description || "",
      image_url: product.image_url || "",
      is_active: product.is_active ?? true,
    });
    setImageFile(null);
  }

  async function deleteProduct(id) {
    if (!window.confirm("Delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) return alert(error.message);

    alert("Product deleted");
    fetchProducts();
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
    setImageFile(null);
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategoryFilter || String(product.category_id) === String(selectedCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  function getPreviewBarcode() {
    if (editId) {
      const existingProduct = products.find((product) => String(product.id) === String(editId));
      if (existingProduct?.barcode) return existingProduct.barcode;
    }
    return String(form.barcode || "").trim();
  }

  async function copyPreviewBarcode() {
    const barcode = getPreviewBarcode();
    if (!barcode) {
      alert("Save the product first to generate its barcode.");
      return;
    }
    try {
      await navigator.clipboard.writeText(barcode);
      alert(`Barcode copied: ${barcode}`);
    } catch {
      window.prompt("Copy this barcode:", barcode);
    }
  }

  function printPreviewBarcode() {
    const barcode = getPreviewBarcode();
    if (!barcode) {
      alert("Save the product first to generate its barcode.");
      return;
    }
    try {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, barcode, { format: "CODE128", displayValue: true, fontSize: 16, margin: 8, height: 60 });
      const svgMarkup = new XMLSerializer().serializeToString(svg);
      const printWindow = window.open("", "_blank", "width=500,height=400");
      if (!printWindow) {
        alert("Please allow pop-ups to print the barcode.");
        return;
      }
      const safeProductName = String(form.name || "Product").replace(/[<>&"]/g, "");
      printWindow.document.open();
      printWindow.document.write(`<!doctype html><html><head><title>Barcode - ${safeProductName}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:24px}svg{max-width:100%;height:auto}</style></head><body><h3>${safeProductName}</h3>${svgMarkup}<script>window.onload=function(){window.print();};</script></body></html>`);
      printWindow.document.close();
    } catch (error) {
      console.error("Barcode print failed:", error);
      alert("Could not create the barcode. Please check the product barcode.");
    }
  }

  const previewProfit =
    Number(form.selling_price || 0) - Number(form.cost_price || 0);

  return (
    <div className="crud-page">
      <div className="page-top">
        <div>
          <h2>Products</h2>
          <p>Manage anime items, stock, pricing and profit.</p>
        </div>
      </div>

      <div className="product-layout">
        <div className="product-form-card">
          <h3>{editId ? "Update Product" : "Add New Product"}</h3>

          <div className="anime-product-form">
            <input name="name" placeholder="Product name *" value={form.name} onChange={handleChange} />

            <select name="category_id" value={form.category_id} onChange={handleChange}>
              <option value="">Select category *</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <input
              name="barcode"
              placeholder="Barcode generated automatically"
              value={form.barcode}
              readOnly
              title="Barcode is assigned automatically and will not change"
            />
            <input name="quantity" type="number" placeholder="Quantity *" value={form.quantity} onChange={handleChange} />
            <input name="cost_price" type="number" placeholder="Cost price *" value={form.cost_price} onChange={handleChange} />
            <input name="selling_price" type="number" placeholder="Selling price *" value={form.selling_price} onChange={handleChange} />

            <input
              className="full-input"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />

            <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange}></textarea>

            <label className="anime-check">
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
              Active Product
            </label>
          </div>

          <div className="form-actions">
            <button onClick={saveProduct}>{editId ? "Update Product" : "Save Product"}</button>
            {editId && <button className="btn-light" onClick={cancelEdit}>Cancel</button>}
          </div>
        </div>

        <div className="product-preview-card">
          <h3>Live Preview</h3>

          <div className="preview-box">
            {imageFile ? (
              <img src={URL.createObjectURL(imageFile)} alt="Preview" />
            ) : form.image_url ? (
              <img src={form.image_url} alt="Preview" />
            ) : (
              <div className="preview-placeholder">🦊</div>
            )}

            <h4>{form.name || "Product Name"}</h4>
            <p>{categories.find((c) => String(c.id) === String(form.category_id))?.name || "Category"}</p>

            <div className="preview-price">Rs. {form.selling_price || "0.00"}</div>
            <div className="preview-profit">Profit: Rs. {previewProfit}</div>
            <div className="preview-stock">Stock: {form.quantity || 0}</div>
            <div className="barcode-actions">
              <button
                type="button"
                className="barcode-action-btn"
                onClick={copyPreviewBarcode}
              >
                Copy Barcode
              </button>

              <button
                type="button"
                className="barcode-action-btn"
                onClick={printPreviewBarcode}
              >
                Print Barcode
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="crud-card">
        <h3>Products</h3>
        <div className="product-category-filter">
          <select
            className="product-category-select"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            aria-label="Filter products by category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <input
          className="search-input"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="table-wrap" style={{ maxHeight: "420px", overflowY: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Barcode</th>
                <th>Cost</th>
                <th>Selling</th>
                <th>Profit</th>
                <th>Qty</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-table">No products found.</td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const profit = Number(product.selling_price) - Number(product.cost_price);

                  return (
                    <tr key={product.id}>
                      <td>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="product-img" />
                        ) : (
                          <span className="no-img">🦊</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => editProduct(product)}
                          title="Click product name to edit"
                          style={{ background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", textAlign: "left" }}
                        >
                          {product.name}
                        </button>
                      </td>
                      <td>{product.categories?.name || "-"}</td>
                      <td>{product.barcode || "-"}</td>
                      <td>Rs. {product.cost_price}</td>
                      <td>Rs. {product.selling_price}</td>
                      <td>Rs. {profit}</td>
                      <td className={product.quantity <= 5 ? "low-stock" : ""}>
                        {product.quantity}
                      </td>
                      <td>
                        <button className="btn-delete" onClick={() => deleteProduct(product.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Products;
