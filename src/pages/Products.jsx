import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

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

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("*");
    setCategories(data || []);
  }

  async function fetchProducts() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true });

    setProducts(data || []);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function uploadImage() {
    if (!imageFile) return form.image_url || null;

    const fileName = `${Date.now()}-${imageFile.name}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile);

    if (error) {
      alert(error.message);
      return null;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function checkDuplicate() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .or(`name.eq.${form.name},barcode.eq.${form.barcode || "NO_BARCODE"}`);

    const duplicate = data?.find((item) => item.id !== editId);

    if (!duplicate) return false;

    if (duplicate.name.toLowerCase() === form.name.toLowerCase()) {
      alert("This product name already exists");
      return true;
    }

    if (form.barcode && duplicate.barcode === form.barcode) {
      alert("This barcode already exists");
      return true;
    }

    return false;
  }

  async function saveProduct() {
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

    const isDuplicate = await checkDuplicate();
    if (isDuplicate) return;

    const uploadedImageUrl = await uploadImage();

    const productData = {
      name: form.name.trim(),
      category_id: Number(form.category_id),
      barcode: form.barcode.trim() || null,
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

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

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

            <input name="barcode" placeholder="Barcode / optional" value={form.barcode} onChange={handleChange} />
            <input name="quantity" type="number" placeholder="Quantity *" value={form.quantity} onChange={handleChange} />
            <input name="cost_price" type="number" placeholder="Cost price *" value={form.cost_price} onChange={handleChange} />
            <input name="selling_price" type="number" placeholder="Selling price *" value={form.selling_price} onChange={handleChange} />

            <input
              className="full-input"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
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
          </div>
        </div>
      </div>

      <div className="crud-card">
        <input
          className="search-input"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="table-wrap">
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
                      <td>{product.name}</td>
                      <td>{product.category_id}</td>
                      <td>{product.barcode || "-"}</td>
                      <td>Rs. {product.cost_price}</td>
                      <td>Rs. {product.selling_price}</td>
                      <td>Rs. {profit}</td>
                      <td className={product.quantity <= 5 ? "low-stock" : ""}>
                        {product.quantity}
                      </td>
                      <td>
                        <button className="btn-edit" onClick={() => editProduct(product)}>Edit</button>
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