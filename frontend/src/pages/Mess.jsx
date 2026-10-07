import { useState, useEffect } from "react";
import { getDailyMenus, getMessExpenses, createDailyMenu, createMessExpense, deleteDailyMenu, deleteMessExpense } from "../services/messService.js";
import notify from "../utils/toast";

function Mess({ pageType = "menu" }) {
  const [menus, setMenus] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isMessManager = user?.role === "mess_manager";
  const isAdmin = user?.role === "admin";
  const canManage = isMessManager || isAdmin;
  const isMenuPage = pageType === "menu";
  const isExpensePage = pageType === "expenses";

  // Menu creation form
  const [isCreatingMenu, setIsCreatingMenu] = useState(false);
  const [newMenu, setNewMenu] = useState({
    menuDate: "",
    breakfast: [""],
    lunch: [""],
    dinner: [""],
  });

  // Expense creation form
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    description: "",
    attachments: [],
  });

  const fetchData = async () => {
    try {
      const [menuRes, expenseRes] = await Promise.all([
        getDailyMenus(),
        getMessExpenses(),
      ]);
      setMenus(menuRes.data.menus || []);
      setExpenses(expenseRes.data.expenses || []);
    } catch (err) {
      console.error(err);
      notify.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, []);

  const handleCreateMenu = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newMenu.menuDate) {
      notify.warning("Please select a menu date.");
      return;
    }

    try {
      const payload = {
        menuDate: newMenu.menuDate,
        breakfast: newMenu.breakfast.filter((item) => item.trim()),
        lunch: newMenu.lunch.filter((item) => item.trim()),
        dinner: newMenu.dinner.filter((item) => item.trim()),
      };

      const res = await createDailyMenu(payload);
      setMenus([res.data.menu, ...menus]);
      notify.success("Menu created successfully!");
      setIsCreatingMenu(false);
      setNewMenu({
        menuDate: "",
        breakfast: [""],
        lunch: [""],
        dinner: [""],
      });
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to create menu.");
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newExpense.title.trim()) {
      notify.warning("Please enter a title for the expense.");
      return;
    }

    try {
      const res = await createMessExpense(newExpense);
      setExpenses([res.data.expense, ...expenses]);
      notify.success("Expense added successfully!");
      setIsCreatingExpense(false);
      setNewExpense({
        title: "",
        description: "",
        attachments: [],
      });
    } catch (err) {
      console.error(err);
      notify.error(err.response?.data?.message || "Failed to create expense.");
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!window.confirm("Delete this menu?")) return;
    try {
      await deleteDailyMenu(menuId);
      setMenus((prev) => prev.filter((m) => m._id !== menuId));
      notify.success("Menu deleted successfully.");
    } catch (err) {
      console.error(err);
      notify.error("Failed to delete menu.");
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await deleteMessExpense(expenseId);
      setExpenses((prev) => prev.filter((e) => e._id !== expenseId));
      notify.success("Expense deleted successfully.");
    } catch (err) {
      console.error(err);
      notify.error("Failed to delete expense.");
    }
  };

  const addMenuItem = (meal) => {
    setNewMenu((prev) => ({
      ...prev,
      [meal]: [...prev[meal], ""],
    }));
  };

  const removeMenuItem = (meal, index) => {
    setNewMenu((prev) => ({
      ...prev,
      [meal]: prev[meal].filter((_, i) => i !== index),
    }));
  };

  const updateMenuItem = (meal, index, value) => {
    setNewMenu((prev) => ({
      ...prev,
      [meal]: prev[meal].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    const maxFiles = 5;
    const maxSize = 2 * 1024 * 1024;

    if (files.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} files only.`);
      e.target.value = "";
      setNewExpense((prev) => ({ ...prev, attachments: [] }));
      return;
    }

    const invalidFile = files.find((file) => file.size > maxSize);
    if (invalidFile) {
      setError(`Each file must be 2 MB or smaller. ${invalidFile.name} is too large.`);
      e.target.value = "";
      setNewExpense((prev) => ({ ...prev, attachments: [] }));
      return;
    }

    setError("");
    setNewExpense((prev) => ({
      ...prev,
      attachments: files,
    }));
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>{isMenuPage ? "Today's Menu" : "Mess Expenses"}</h2>
          <p className="text-muted">
            {isMenuPage
              ? canManage ? "Manage the daily menu for the hall." : "View the daily menu for your hall."
              : canManage ? "Track and manage mess expenses." : "View mess expenses recorded for your hall."}
          </p>
        </div>
        {canManage && (
          <div className="d-flex gap-2">
            {isMenuPage && (
              <button
                className="btn btn-primary"
                style={{ backgroundColor: "#102A43", borderColor: "#102A43" }}
                onClick={() => setIsCreatingMenu((prev) => !prev)}
              >
                {isCreatingMenu ? "Cancel" : "Add Today's Menu"}
              </button>
            )}
            {isExpensePage && (
              <button
                className="btn btn-primary"
                style={{ backgroundColor: "#102A43", borderColor: "#102A43" }}
                onClick={() => setIsCreatingExpense((prev) => !prev)}
              >
                {isCreatingExpense ? "Cancel" : "Add Expense"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Create Menu Form */}
      {isCreatingMenu && canManage && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-3">Add Daily Menu</h5>
            <form onSubmit={handleCreateMenu}>
              <div className="mb-3">
                <label className="form-label">Menu Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newMenu.menuDate}
                  onChange={(e) =>
                    setNewMenu((prev) => ({ ...prev, menuDate: e.target.value }))
                  }
                  required
                />
              </div>

              {["breakfast", "lunch", "dinner"].map((meal) => (
                <div key={meal} className="mb-3">
                  <label className="form-label">
                    {meal.charAt(0).toUpperCase() + meal.slice(1)}
                  </label>
                  {newMenu[meal].map((item, idx) => (
                    <div key={idx} className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`${meal} item ${idx + 1}`}
                        value={item}
                        onChange={(e) =>
                          updateMenuItem(meal, idx, e.target.value)
                        }
                      />
                      {newMenu[meal].length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeMenuItem(meal, idx)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => addMenuItem(meal)}
                  >
                    + Add Item
                  </button>
                </div>
              ))}

              <button
                className="btn btn-primary w-100"
                type="submit"
                style={{ backgroundColor: "#003366", borderColor: "#003366" }}
              >
                Create Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Expense Form */}
      {isCreatingExpense && canManage && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="mb-3">Add Expense</h5>
            <form onSubmit={handleCreateExpense}>
              <div className="mb-3">
                <label className="form-label">Expense Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Expense title"
                  value={newExpense.title}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Describe the expense"
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                ></textarea>
              </div>

              <div className="mb-3">
                <label className="form-label">Upload Supporting Files</label>
                <input
                  type="file"
                  className="form-control"
                  multiple
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                />
                <small className="text-muted">
                  Max 5 files, each up to 2 MB. Files upload to Cloudinary.
                </small>
              </div>

              <button
                className="btn btn-primary w-100"
                type="submit"
                style={{ backgroundColor: "#003366", borderColor: "#003366" }}
              >
                Add Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {isMenuPage && (
        <div>
          {menus.length === 0 ? (
            <div className="alert alert-info">No menus available.</div>
          ) : (
            menus.map((menu) => (
              <div key={menu._id} className="card shadow-sm mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h5 className="mb-1">
                        {new Date(menu.menuDate).toLocaleDateString()}
                      </h5>
                      <small className="text-muted">
                        {menu.hallId ? `Hall ${menu.hallId.hallNumber} - ${menu.hallId.hallName}` : "Hall"} • By {menu.createdBy?.name}
                      </small>
                    </div>
                    {canManage && String(menu.createdBy?._id || menu.createdBy) === String(user?.id) && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteMenu(menu._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="row mt-3">
                    <div className="col-md-4">
                      <h6 className="mb-2">Breakfast</h6>
                      <ul className="list-unstyled">
                        {menu.breakfast && menu.breakfast.length > 0 ? (
                          menu.breakfast.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))
                        ) : (
                          <small className="text-muted">No items</small>
                        )}
                      </ul>
                    </div>
                    <div className="col-md-4">
                      <h6 className="mb-2">Lunch</h6>
                      <ul className="list-unstyled">
                        {menu.lunch && menu.lunch.length > 0 ? (
                          menu.lunch.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))
                        ) : (
                          <small className="text-muted">No items</small>
                        )}
                      </ul>
                    </div>
                    <div className="col-md-4">
                      <h6 className="mb-2">Dinner</h6>
                      <ul className="list-unstyled">
                        {menu.dinner && menu.dinner.length > 0 ? (
                          menu.dinner.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))
                        ) : (
                          <small className="text-muted">No items</small>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {isExpensePage && (
        <div>
          {expenses.length === 0 ? (
            <div className="alert alert-info">No expenses recorded.</div>
          ) : (
            expenses.map((expense) => (
              <div key={expense._id} className="card shadow-sm mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="mb-1">{expense.title}</h5>
                      <small className="text-muted">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="text-end">
                      {canManage && String(expense.createdBy?._id || expense.createdBy) === String(user?.id) && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteExpense(expense._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {expense.description && (
                    <p className="text-muted small mb-2">{expense.description}</p>
                  )}

                  {expense.attachments && expense.attachments.length > 0 && (
                    <div className="mt-2">
                      <small className="d-block mb-2 fw-bold">Receipts:</small>
                      <div className="d-flex flex-wrap gap-2">
                        {expense.attachments.map((attachment, i) => (
                          <a
                            key={i}
                            href={`${import.meta.env.VITE_API_URL}/${attachment}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-secondary"
                          >
                            Receipt {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <small className="text-muted d-block mt-2">
                    By {expense.createdBy?.name}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Mess;