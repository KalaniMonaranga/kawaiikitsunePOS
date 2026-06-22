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
      .order("id", { ascending: true });

    if (error) return alert(error.message);
    setCustomers(data || []);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function checkDuplicate() {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .or(`phone.eq.${form.phone},email.eq.${form.email || "NO_EMAIL"}`);

    const duplicate = data?.find((item) => item.id !== editId);

    if (!duplicate) return false;

    if (duplicate.phone === form.phone) {
      alert("This phone number already exists");
      return true;
    }

    if (form.email && duplicate.email === form.email) {
      alert("This email already exists");
      return true;
    }

    return false;
  }

  async function saveCustomer() {
    if (!form.name || !form.phone) {
      alert("Customer name and phone number are required");
      return;
    }

    const isDuplicate = await checkDuplicate();
    if (isDuplicate) return;

    const customerData = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    };

    if (editId) {
      const { error } = await supabase
        .from("customers")
        .update(customerData)
        .eq("id", editId);

      if (error) return alert(error.message);
      alert("Customer updated");
    } else {
      const { error } = await supabase.from("customers").insert([
        {
          ...customerData,
          loyalty_points: 0,
        },
      ]);

      if (error) return alert(error.message);
      alert("Customer saved");
    }

    setForm(emptyForm);
    setEditId(null);
    fetchCustomers();
  }

  function editCustomer(customer) {
    setEditId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
  }

  async function deleteCustomer(id) {
    if (!window.confirm("Delete this customer?")) return;

    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) return alert(error.message);

    alert("Customer deleted");
    fetchCustomers();
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  const filteredCustomers = customers.filter((customer) => {
    const keyword = search.toLowerCase();

    return (
      customer.name?.toLowerCase().includes(keyword) ||
      customer.phone?.toLowerCase().includes(keyword) ||
      customer.email?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="crud-page">
      <div className="page-top">
        <div>
          <h2>Customers</h2>
          <p>Add, update, search and manage loyal customers.</p>
        </div>
      </div>

      <div className="customer-layout">
        <div className="customer-form-card">
          <h3>{editId ? "Update Customer" : "Add New Customer"}</h3>

          <div className="customer-form-grid">
            <input
              name="name"
              placeholder="Customer name *"
              value={form.name}
              onChange={handleChange}
            />

            <input
              name="phone"
              placeholder="Phone number *"
              value={form.phone}
              onChange={handleChange}
            />

            <input
              name="email"
              placeholder="Email optional"
              value={form.email}
              onChange={handleChange}
            />

            <textarea
              name="address"
              placeholder="Address / Notes optional"
              value={form.address}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="form-actions">
            <button onClick={saveCustomer}>
              {editId ? "Update Customer" : "Save Customer"}
            </button>

            {editId && (
              <button className="btn-light" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="customer-info-card">
          <h3>Loyalty System</h3>
          <p>Customers earn loyalty points automatically from purchases.</p>
          <div className="loyalty-box">2% from each purchase</div>
        </div>
      </div>

      <div className="crud-card">
        <input
          className="search-input"
          placeholder="Search by name, phone or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Loyalty Points</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-table">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.email || "-"}</td>
                    <td>{Number(customer.loyalty_points || 0).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn-edit"
                        onClick={() => editCustomer(customer)}
                      >
                        Edit
                      </button>

                      <button
                        className="btn-delete"
                        onClick={() => deleteCustomer(customer.id)}
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

export default Customers;