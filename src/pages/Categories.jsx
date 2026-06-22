import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setCategories(data);
  }

  async function saveCategory() {
    if (!categoryName.trim()) {
      alert("Please enter category name");
      return;
    }

    if (editId) {
      const { error } = await supabase
        .from("categories")
        .update({ name: categoryName })
        .eq("id", editId);

      if (error) {
        alert(error.message);
        return;
      }

      setEditId(null);
    } else {
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: categoryName, description: "" }])
        .select()
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setCategories((prev) => [...prev, data]);
    }

    setCategoryName("");
    await fetchCategories();
  }

  function editCategory(category) {
    setEditId(category.id);
    setCategoryName(category.name);
  }

  function cancelEdit() {
    setEditId(null);
    setCategoryName("");
  }

  async function deleteCategory(id) {
    const confirmDelete = window.confirm("Delete this category?");

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchCategories();
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="crud-page">
      <div className="page-top">
        <div>
          <h2>Categories</h2>
          <p>Add, update, search and manage product categories.</p>
        </div>
      </div>

      <div className="crud-card">
        <div className="form-row">
          <input
            type="text"
            placeholder="Category name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />

          <button onClick={saveCategory}>
            {editId ? "Update Category" : "Add Category"}
          </button>

          {editId && (
            <button className="btn-light" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="Search category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Category Name</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-table">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.id}</td>
                    <td>{category.name}</td>
                    <td>
                      {category.created_at
                        ? new Date(category.created_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => editCategory(category)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-delete"
                        onClick={() => deleteCategory(category.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Categories;