import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { allHallOptions } from "../utils/hallOptions";
import "./AdminUsers.css";

const roleLabels = {
  student: "Student",
  warden: "Warden",
  mess_manager: "Mess Manager",
  admin: "Admin",
};

const departments = [
  ["BT", "Biotechnology"], ["CE", "Civil Engineering"], ["CH", "Chemical Engineering"],
  ["CS", "Computer Science & Engineering"], ["EC", "Electronics & Communication Engineering"],
  ["EE", "Electrical Engineering"], ["ME", "Mechanical Engineering"],
  ["MM", "Metallurgical & Materials Engineering"], ["CY", "Chemistry"], ["PH", "Physics"],
  ["MA", "Mathematics"], ["ES", "Earth & Environmental Studies"],
  ["HS", "Humanities & Social Sciences"], ["MS", "Management Studies"],
];

const emptyForm = {
  role: "",
  name: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  hallId: "",
  registrationNo: "",
  rollNo: "",
  department: "",
  course: "",
  currentYear: "",
  parentPhone: "",
  gender: "",
  designation: "",
  officePhone: "",
  companyName: "",
  managerId: "",
  adminLevel: "",
};

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [halls, setHalls] = useState([]);
  const [roleFilter, setRoleFilter] = useState("All");
  const [hallFilter, setHallFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [editUserData, setEditUserData] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [transferUser, setTransferUser] = useState(null);
  const [transferHallId, setTransferHallId] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [bulkGender, setBulkGender] = useState("All");
  const [bulkYear, setBulkYear] = useState("All");
  const [bulkDepartments, setBulkDepartments] = useState([]);
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const [bulkSourceHall, setBulkSourceHall] = useState("All");
  const [bulkSelected, setBulkSelected] = useState([]);
  const [bulkDestinationHallId, setBulkDestinationHallId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [deletingFinalYear, setDeletingFinalYear] = useState(false);
  const currentAdminId = JSON.parse(localStorage.getItem("user") || "{}").id;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersResponse, hallsResponse] = await Promise.all([
          api.get("/users/admin/all"),
          api.get("/halls"),
        ]);
        setUsers(usersResponse.data.users || []);
        setHalls((hallsResponse.data.halls || []).sort((a, b) => a.hallNumber - b.hallNumber));
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.response?.data?.message || "Failed to load users.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const wardenIds = useMemo(() => {
    const countsByHall = new Map();
    return new Map(users
      .filter((user) => user.role === "warden")
      .sort((first, second) => (first.hallId?.hallNumber || Number.MAX_SAFE_INTEGER) - (second.hallId?.hallNumber || Number.MAX_SAFE_INTEGER) || first.name.localeCompare(second.name))
      .map((warden) => {
        const hallNumber = warden.hallId?.hallNumber || "0";
        const index = (countsByHall.get(hallNumber) || 0) + 1;
        countsByHall.set(hallNumber, index);
        return [warden._id, `WD${hallNumber}${String(index).padStart(2, "0")}`];
      }));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((user) => {
      const userHallNumber = user.hallId?.hallNumber || "";
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesHall = hallFilter === "All" || String(userHallNumber) === hallFilter;
      const matchesSearch = !query || [
        user.name,
        user.username,
        user.email,
        user.registrationNo,
        user.rollNo,
        user.managerId,
        wardenIds.get(user._id),
      ].some((value) => String(value || "").toLowerCase().includes(query));

      return matchesRole && matchesHall && matchesSearch;
    }).sort((firstUser, secondUser) => {
      const roleOrder = { admin: 0, mess_manager: 1, student: 2, warden: 3 };
      const roleDifference = roleOrder[firstUser.role] - roleOrder[secondUser.role];
      if (roleDifference !== 0) return roleDifference;

      if (firstUser.role === "warden" && secondUser.role === "warden") {
        const firstHall = firstUser.hallId?.hallNumber || Number.MAX_SAFE_INTEGER;
        const secondHall = secondUser.hallId?.hallNumber || Number.MAX_SAFE_INTEGER;
        return firstHall - secondHall || firstUser.name.localeCompare(secondUser.name);
      }

      return 0;
    });
  }, [users, roleFilter, hallFilter, search, wardenIds]);

  const clearFilters = () => {
    setRoleFilter("All");
    setHallFilter("All");
    setSearch("");
  };

  const bulkCandidates = useMemo(() => users.filter((user) => user.role === "student"
    && (bulkGender === "All" || user.gender === bulkGender)
    && (bulkYear === "All" || String(user.currentYear) === bulkYear)
    && (bulkDepartments.length === 0 || bulkDepartments.includes(user.department))
    && (bulkSourceHall === "All" || String(user.hallId?.hallNumber) === bulkSourceHall)), [users, bulkGender, bulkYear, bulkDepartments, bulkSourceHall]);
  const destinationHalls = useMemo(() => halls.filter((hall) => hall.isActive !== false
    && (bulkGender === "All" || hall.gender === bulkGender)
    && (bulkSourceHall === "All" || String(hall.hallNumber) !== bulkSourceHall)), [halls, bulkGender, bulkSourceHall]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const closeAddUser = () => {
    setShowAddUser(false);
    setFormData(emptyForm);
    setFormError("");
  };

  const openBulkTransfer = () => {
    setShowBulkTransfer(true);
    setBulkSelected([]);
    setBulkDepartments([]);
    setDepartmentMenuOpen(false);
    setBulkDestinationHallId("");
    setBulkSourceHall(hallFilter);
    setBulkError("");
  };

  const closeBulkTransfer = () => {
    setShowBulkTransfer(false);
    setBulkSelected([]);
    setBulkDepartments([]);
    setDepartmentMenuOpen(false);
    setBulkDestinationHallId("");
    setBulkError("");
  };

  const toggleBulkStudent = (studentId) => setBulkSelected((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]);
  const selectAllBulkStudents = () => setBulkSelected((current) => current.length === bulkCandidates.length ? [] : bulkCandidates.map((student) => student._id));

  const handleBulkTransfer = async (event) => {
    event.preventDefault();
    if (!destinationHalls.some((hall) => hall._id === bulkDestinationHallId)) { setBulkError("Choose an available destination hall."); return; }
    setBulkLoading(true);
    setBulkError("");
    try {
      await api.post("/users/admin/bulk-transfer", { transfers: bulkSelected.map((studentId) => ({ studentId, hallId: bulkDestinationHallId })) });
      const response = await api.get("/users/admin/all");
      setUsers(response.data.users || []);
      closeBulkTransfer();
    } catch (saveError) {
      setBulkError(saveError.response?.data?.message || "Failed to transfer students.");
    } finally {
      setBulkLoading(false);
    }
  };

  const openTransfer = (user) => {
    setTransferUser(user);
    setTransferHallId("");
    setTransferError("");
  };

  const closeTransfer = () => {
    setTransferUser(null);
    setTransferHallId("");
    setTransferError("");
  };

  const handleTransfer = async (event) => {
    event.preventDefault();
    setTransferLoading(true);
    setTransferError("");
    try {
      const response = await api.post(`/users/admin/${transferUser._id}/transfer`, { hallId: transferHallId });
      setUsers((current) => current.map((item) => item._id === transferUser._id ? response.data.user : item));
      closeTransfer();
    } catch (saveError) {
      setTransferError(saveError.response?.data?.message || "Failed to transfer student.");
    } finally {
      setTransferLoading(false);
    }
  };

  const handleAddUser = async (event) => {
    event.preventDefault();
    setFormError("");
    setSavingUser(true);

    try {
      const payload = Object.fromEntries(
        Object.entries(formData).filter(([, value]) => value !== "")
      );
      const response = await api.post("/users/admin/create", payload);
      setUsers((current) => [...current, response.data.user]);
      closeAddUser();
    } catch (saveError) {
      console.error(saveError);
      setFormError(saveError.response?.data?.message || "Failed to create user.");
    } finally {
      setSavingUser(false);
    }
  };

  const editUser = (user) => {
    setEditUserData({
      _id: user._id,
      role: user.role,
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      course: user.course || "",
      currentYear: user.currentYear || "",
      parentPhone: user.parentPhone || "",
      gender: user.gender || "",
      designation: user.designation || "",
      officePhone: user.officePhone || "",
      companyName: user.companyName || "",
      managerId: user.managerId || "",
      rollNo: user.rollNo || "",
      adminLevel: user.adminLevel || "",
    });
    setEditError("");
  };

  const closeEditUser = () => {
    setEditUserData(null);
    setEditError("");
  };

  const updateEditField = (event) => {
    const { name, value } = event.target;
    setEditUserData((current) => ({ ...current, [name]: value }));
  };

  const handleEditUser = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    setEditError("");
    try {
      const payload = Object.fromEntries(Object.entries(editUserData).filter(([key, value]) => key !== "_id" && key !== "role" && value !== ""));
      if (payload.currentYear) payload.currentYear = Number(payload.currentYear);
      if (payload.adminLevel) payload.adminLevel = Number(payload.adminLevel);
      const response = await api.patch(`/users/admin/${editUserData._id}`, payload);
      setUsers((current) => current.map((item) => item._id === editUserData._id ? response.data.user : item));
      closeEditUser();
    } catch (saveError) {
      setEditError(saveError.response?.data?.message || "Failed to update user.");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleUser = async (user) => {
    try {
      const response = await api.patch(`/users/admin/${user._id}/status`, { isActive: !user.isActive });
      setUsers((current) => current.map((item) => item._id === user._id ? { ...item, ...response.data.user } : item));
    } catch (saveError) { setError(saveError.response?.data?.message || "Failed to update user status."); }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}?`)) return;
    try { await api.delete(`/users/admin/${user._id}`); setUsers((current) => current.filter((item) => item._id !== user._id)); }
    catch (deleteError) { setError(deleteError.response?.data?.message || "Failed to delete user."); }
  };

  const deleteFinalYearStudents = async () => {
    const finalYearCount = users.filter((user) => user.role === "student" && user.currentYear === 4).length;
    if (!finalYearCount || !window.confirm(`Permanently delete ${finalYearCount} final-year student records and all related certificates, fines, issues, votes, and residence history?`)) return;
    setDeletingFinalYear(true);
    setError("");
    try {
      await api.delete("/users/admin/final-year");
      setUsers((current) => current.filter((user) => !(user.role === "student" && user.currentYear === 4)));
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Failed to delete final-year student records.");
    } finally {
      setDeletingFinalYear(false);
    }
  };

  const renderField = (label, name, type = "text", options = {}) => (
    <div className="admin-users-form-field" key={name}>
      <label htmlFor={`new-user-${name}`}>{label}</label>
      {options.select ? (
        <select id={`new-user-${name}`} name={name} value={formData[name]} onChange={updateForm} required={options.required}>
          <option value="">Select {label}</option>
          {options.select.map(([value, optionLabel, disabled]) => <option key={value} value={value} disabled={disabled}>{optionLabel}</option>)}
        </select>
      ) : (
        <input id={`new-user-${name}`} name={name} type={type} value={formData[name]} onChange={updateForm} required={options.required} min={options.min} max={options.max} maxLength={options.maxLength} />
      )}
    </div>
  );

  if (loading) {
    return <div className="admin-users-loading"><div className="spinner-border" role="status" /></div>;
  }

  return (
    <div className="admin-users-page">
      <div className="admin-users-header">
        <div>
          <h1>User Management</h1>
          <p>View users across all halls and roles.</p>
        </div>
        <div className="admin-users-header-actions">
          <strong>{filteredUsers.length} of {users.length} users</strong>
          <button type="button" className="admin-users-danger" onClick={deleteFinalYearStudents} disabled={deletingFinalYear}>{deletingFinalYear ? "Deleting..." : "Delete final-year records"}</button>
          <button type="button" className="admin-users-bulk-transfer" onClick={openBulkTransfer}>Transfer students</button>
          <button type="button" className="admin-users-add" onClick={() => setShowAddUser(true)}>+ Add User</button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <section className="admin-users-filters" aria-label="User filters">
        <div className="admin-users-filter-row">
          <div className="admin-users-field admin-users-search">
            <label htmlFor="user-search">Search</label>
            <input id="user-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, username, email, ID" />
          </div>
          <div className="admin-users-field">
            <label htmlFor="user-role">Role</label>
            <select id="user-role" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="All">All roles</option>
              {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="admin-users-field admin-users-hall-select">
            <label htmlFor="user-hall">Hall</label>
            <select id="user-hall" value={hallFilter} onChange={(event) => setHallFilter(event.target.value)}>
              <option value="All">All halls</option>
              {allHallOptions.map(([hallNumber, hallName]) => <option key={hallNumber} value={hallNumber}>Hall {hallNumber} - {hallName}</option>)}
            </select>
          </div>
          <button type="button" className="admin-users-clear" onClick={clearFilters}>Clear filters</button>
        </div>
      </section>

      <div className="admin-users-table-wrap">
        <table className="admin-users-table">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Username</th><th>Contact</th><th>Hall</th><th>ID</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan="8" className="admin-users-empty">No users match the selected filters.</td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user._id}>
                <td><strong>{user.name}</strong><small>{user.email || "No email"}</small></td>
                <td><span className={`admin-users-role role-${user.role}`}>{roleLabels[user.role] || user.role}</span></td>
                <td>{user.username}</td>
                <td>{user.phone || "-"}</td>
                <td>{user.hallId ? `Hall ${user.hallId.hallNumber} - ${user.hallId.hallName}` : "Unassigned"}</td>
                <td>{user.role === "student" ? user.rollNo || "-" : user.role === "warden" ? wardenIds.get(user._id) : user.managerId || "-"}</td>
                <td><span className={`admin-users-status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
                <td>{user._id === currentAdminId ? <span className="admin-users-self">Current account</span> : <div className="admin-users-row-actions"><button type="button" onClick={() => editUser(user)}>Edit</button>{user.role === "student" && <button type="button" onClick={() => openTransfer(user)}>Transfer</button>}<button type="button" onClick={() => toggleUser(user)}>{user.isActive ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => removeUser(user)}>Delete</button></div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddUser && (
        <div className="admin-users-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeAddUser()}>
          <form className="admin-users-modal" onSubmit={handleAddUser}>
            <div className="admin-users-modal-header">
              <div><h2>Add User</h2><p>Select a role first, then complete the relevant fields.</p></div>
              <button type="button" className="admin-users-modal-close" onClick={closeAddUser} aria-label="Close">&times;</button>
            </div>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div className="admin-users-form-grid">
              {renderField("Role", "role", "text", { required: true, select: Object.entries(roleLabels) })}
              {formData.role && renderField("Full name", "name", "text", { required: true })}
              {formData.role && formData.role !== "student" && renderField("Username", "username", "text", { required: true })}
              {formData.role && renderField("Password", "password", "password", { required: true, maxLength: 128 })}
              {formData.role && renderField("Email", "email", "email")}
              {formData.role && renderField("Phone", "phone", "tel")}
              {formData.role && formData.role !== "student" && renderField("Hall", "hallId", "text", { select: allHallOptions.map(([hallNumber, hallName]) => { const hall = halls.find((item) => item.hallNumber === hallNumber); return [hall?._id || `uncreated-${hallNumber}`, `Hall ${hallNumber} - ${hallName}${hall ? "" : " (not created)"}`, !hall]; }) })}
              {formData.role === "student" && <>
                {renderField("Registration number", "registrationNo", "text", { required: true })}
                {renderField("Roll number", "rollNo", "text", { required: true })}
                {renderField("Department", "department", "text", { select: departments })}
                {renderField("Course", "course", "text", { required: true, select: [["BTech", "BTech"]] })}
                {renderField("Parent phone", "parentPhone", "tel")}
                {renderField("Gender", "gender", "text", { select: [["Male", "Male"], ["Female", "Female"]] })}
                <p className="admin-users-form-help">Student login username will be the registration number.</p>
              </>}
              {formData.role === "warden" && <>
                {renderField("Designation", "designation")}
                {renderField("Office phone", "officePhone", "tel")}
              </>}
              {formData.role === "mess_manager" && <>
                {renderField("Company name", "companyName")}
                {renderField("Manager ID", "managerId", "text", { required: true })}
              </>}
              {formData.role === "admin" && renderField("Admin level", "adminLevel", "number", { min: 1 })}
            </div>
            <div className="admin-users-modal-actions">
              <button type="button" className="admin-users-clear" onClick={closeAddUser}>Cancel</button>
              <button type="submit" className="admin-users-add" disabled={!formData.role || savingUser}>{savingUser ? "Creating..." : "Create user"}</button>
            </div>
          </form>
        </div>
      )}

      {showBulkTransfer && (
        <div className="admin-users-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeBulkTransfer()}>
          <form className="admin-users-modal admin-users-bulk-modal" onSubmit={handleBulkTransfer}>
            <div className="admin-users-modal-header"><div><h2>Transfer students in bulk</h2><p>Filter students, select the batch, then choose one destination hall. The destination warden will assign rooms.</p></div><button type="button" className="admin-users-modal-close" onClick={closeBulkTransfer} aria-label="Close">&times;</button></div>
            {bulkError && <div className="alert alert-danger">{bulkError}</div>}
            <div className="admin-users-bulk-filters">
              <BulkFilter label="Gender" value={bulkGender} onChange={setBulkGender} options={["All", "Male", "Female"]} />
              <BulkFilter label="Year" value={bulkYear} onChange={setBulkYear} options={["All", "1", "2", "3", "4"]} optionPrefix="Year " />
              <div className="admin-users-multi-filter"><span>Departments</span><button type="button" className="admin-users-department-trigger" onClick={() => setDepartmentMenuOpen((current) => !current)}>{bulkDepartments.length ? `${bulkDepartments.length} departments selected` : "All departments"}<span>⌄</span></button>{departmentMenuOpen && <div className="admin-users-department-menu">{departments.map(([value, label]) => <label key={value}><input type="checkbox" checked={bulkDepartments.includes(value)} onChange={() => setBulkDepartments((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} /> <span>{label}</span></label>)}<button type="button" className="admin-users-department-done" onClick={() => setDepartmentMenuOpen(false)}>Done</button></div>}</div>
              <BulkFilter label="Current hall" value={bulkSourceHall} onChange={setBulkSourceHall} options={["All", ...halls.map((hall) => String(hall.hallNumber))]} optionPrefix="Hall " className="admin-users-current-hall-filter" />
            </div>
            <div className="admin-users-bulk-selection"><label className="admin-users-select-all"><input type="checkbox" checked={bulkCandidates.length > 0 && bulkSelected.length === bulkCandidates.length} onChange={selectAllBulkStudents} /> Select all filtered students</label><strong>{bulkSelected.length} selected / {bulkCandidates.length} matching</strong></div>
            <div className="admin-users-bulk-list">{bulkCandidates.length ? bulkCandidates.map((student) => <label className="admin-users-bulk-student" key={student._id}><input type="checkbox" checked={bulkSelected.includes(student._id)} onChange={() => toggleBulkStudent(student._id)} /><span><strong>{student.name}</strong><small>{student.registrationNo} · {student.department || "No department"} · Year {student.currentYear || "-"} · Hall {student.hallId?.hallNumber || "-"}</small></span></label>) : <p className="admin-users-empty">No students match these filters.</p>}</div>
            <div className="admin-users-branch-destinations"><h3>Destination hall</h3><div className="admin-users-form-field"><label htmlFor="bulk-destination-hall">Choose one destination for all selected students</label><select id="bulk-destination-hall" value={bulkDestinationHallId} onChange={(event) => setBulkDestinationHallId(event.target.value)} required><option value="">Select destination hall</option>{destinationHalls.map((hall) => <option key={hall._id} value={hall._id}>Hall {hall.hallNumber} - {hall.hallName}</option>)}</select></div></div>
            <div className="admin-users-modal-actions"><button type="button" className="admin-users-clear" onClick={closeBulkTransfer}>Cancel</button><button type="submit" className="admin-users-add" disabled={bulkLoading || bulkSelected.length === 0}>{bulkLoading ? "Transferring..." : `Transfer ${bulkSelected.length} students`}</button></div>
          </form>
        </div>
      )}

      {editUserData && (
        <div className="admin-users-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeEditUser()}>
          <form className="admin-users-modal" onSubmit={handleEditUser}>
            <div className="admin-users-modal-header"><div><h2>Edit user</h2><p>Update profile and role-specific details. Hall and room changes use the transfer action.</p></div><button type="button" className="admin-users-modal-close" onClick={closeEditUser} aria-label="Close">&times;</button></div>
            {editError && <div className="alert alert-danger">{editError}</div>}
            <div className="admin-users-form-grid">
              <EditField label="Full name" name="name" value={editUserData.name} onChange={updateEditField} required />
              <EditField label="Email" name="email" type="email" value={editUserData.email} onChange={updateEditField} />
              <EditField label="Phone" name="phone" type="tel" value={editUserData.phone} onChange={updateEditField} />
              {editUserData.role === "student" && <>
                <EditField label="Department" name="department" value={editUserData.department} onChange={updateEditField} select={departments} />
                <EditField label="Course" name="course" value={editUserData.course} onChange={updateEditField} />
                <EditField label="Current year" name="currentYear" type="number" min="1" max="10" value={editUserData.currentYear} onChange={updateEditField} />
                <EditField label="Parent phone" name="parentPhone" type="tel" value={editUserData.parentPhone} onChange={updateEditField} />
                <EditField label="Gender" name="gender" value={editUserData.gender} onChange={updateEditField} select={[["Male", "Male"], ["Female", "Female"]]} />
              </>}
              {editUserData.role === "warden" && <>
                <EditField label="Designation" name="designation" value={editUserData.designation} onChange={updateEditField} />
                <EditField label="Office phone" name="officePhone" type="tel" value={editUserData.officePhone} onChange={updateEditField} />
              </>}
              {editUserData.role === "mess_manager" && <>
                <EditField label="Company name" name="companyName" value={editUserData.companyName} onChange={updateEditField} />
                <EditField label="Manager ID" name="managerId" value={editUserData.managerId} onChange={updateEditField} />
              </>}
              {editUserData.role === "admin" && <EditField label="Admin level" name="adminLevel" type="number" min="1" value={editUserData.adminLevel} onChange={updateEditField} />}
            </div>
            <div className="admin-users-modal-actions"><button type="button" className="admin-users-clear" onClick={closeEditUser}>Cancel</button><button type="submit" className="admin-users-add" disabled={savingEdit}>{savingEdit ? "Saving..." : "Save changes"}</button></div>
          </form>
        </div>
      )}

      {transferUser && (
        <div className="admin-users-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeTransfer()}>
          <form className="admin-users-modal" onSubmit={handleTransfer}>
            <div className="admin-users-modal-header"><div><h2>Transfer student</h2><p>Move {transferUser.name} to another hall and optionally assign a room.</p></div><button type="button" className="admin-users-modal-close" onClick={closeTransfer} aria-label="Close">&times;</button></div>
            {transferError && <div className="alert alert-danger">{transferError}</div>}
            <div className="admin-users-form-grid">
              <div className="admin-users-form-field"><label>Current hall</label><input value={transferUser.hallId ? `Hall ${transferUser.hallId.hallNumber} - ${transferUser.hallId.hallName}` : "No hall assigned"} readOnly /></div>
              <div className="admin-users-form-field"><label htmlFor="transfer-hall">Destination hall</label><select id="transfer-hall" value={transferHallId} onChange={(event) => setTransferHallId(event.target.value)} required><option value="">Select destination hall</option>{halls.filter((hall) => hall.gender === transferUser.gender && hall._id !== transferUser.hallId?._id).map((hall) => <option key={hall._id} value={hall._id}>Hall {hall.hallNumber} - {hall.hallName}</option>)}</select></div>
            </div>
            <div className="admin-users-modal-actions"><button type="button" className="admin-users-clear" onClick={closeTransfer}>Cancel</button><button type="submit" className="admin-users-add" disabled={transferLoading}>{transferLoading ? "Transferring..." : "Transfer student"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function EditField({ label, name, type = "text", value, onChange, required, min, max, select }) {
  return <div className="admin-users-form-field"><label htmlFor={`edit-user-${name}`}>{label}</label>{select ? <select id={`edit-user-${name}`} name={name} value={value} onChange={onChange} required={required}><option value="">Select {label}</option>{select.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select> : <input id={`edit-user-${name}`} name={name} type={type} value={value} onChange={onChange} required={required} min={min} max={max} />}</div>;
}

function BulkFilter({ label, value, onChange, options, optionPrefix = "", className = "" }) {
  return <label className={`admin-users-form-field ${className}`}><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option === "All" ? `All ${label.toLowerCase()}s` : `${optionPrefix}${option}`}</option>)}</select></label>;
}

export default AdminUsers;