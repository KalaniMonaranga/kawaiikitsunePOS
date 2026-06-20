import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

function Customers() {
  const emptyForm = {
    name: "",
    phone: "",
    email: "",
    address: "",
  };

  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("id");

    if (error) return alert(error.message);
    setCustomers(data || []);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function saveCustomer() {
    if (!form.name || !form.phone) {
      alert("Name and phone required");
      return;
    }

    const dataToSave = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email || null,
      address: form.address || null,
    };

    if (editId) {
      await supabase.from("customers").update(dataToSave).eq("id", editId);
      alert("Updated");
    } else {
      await supabase.from("customers").insert([
        { ...dataToSave, loyalty_points: 0 },
      ]);
      alert("Saved");
    }

    setForm(emptyForm);
    setEditId(null);
    fetchCustomers();
  }

  function editCustomer(c) {
    setEditId(c.id);
    setForm(c);
  }

  async function deleteCustomer(id) {
    if (!window.confirm("Delete?")) return;
    await supabase.from("customers").delete().eq("id", id);
    fetchCustomers();
  }

  const filtered = customers.filter((c) =>
    `${c.name}${c.phone}${c.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <h2>Customers</h2>

      {/* FORM */}
      <div className="customer-form">
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
        <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} />
        <input name="address" placeholder="Address" value={form.address} onChange={handleChange} />

        <button onClick={saveCustomer}>
          {editId ? "Update" : "Save"}
        </button>
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* TABLE */}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Points</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filtered.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.phone}</td>
              <td>{c.email || "-"}</td>
              <td>{Number(c.loyalty_points || 0).toFixed(2)}</td>
              <td>
                <button onClick={() => editCustomer(c)}>Edit</button>
                <button onClick={() => deleteCustomer(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Customers;