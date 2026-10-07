import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { allHallOptions } from "../utils/hallOptions";
import notify from "../utils/toast";
import "./AdminHalls.css";

const emptyHall = {
  hallNumber: "",
  hallName: "",
  shortName: "",
  gender: "Male",
  totalFloors: "",
  blocks: "",
  capacity: "",
  description: "",
};

function AdminHalls() {
  const [halls, setHalls] = useState([]);
  const [hallFilter, setHallFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showHallForm, setShowHallForm] = useState(false);
  const [hallForm, setHallForm] = useState(emptyHall);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const hallResponse = await api.get("/halls");
      setHalls((hallResponse.data.halls || []).sort((a, b) => a.hallNumber - b.hallNumber));
    } catch (loadError) {
      notify.error(loadError.response?.data?.message || "Failed to load halls and rooms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void Promise.resolve().then(loadData); }, []);

  const filteredHalls = useMemo(() => halls.filter((hall) => {
    const query = search.trim().toLowerCase();
    return (hallFilter === "All" || String(hall.hallNumber) === hallFilter)
      && (genderFilter === "All" || hall.gender === genderFilter)
      && (!query || `${hall.hallName} ${hall.shortName || ""}`.toLowerCase().includes(query));
  }), [halls, hallFilter, genderFilter, search]);

  const updateHallForm = (event) => setHallForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const createHall = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...hallForm, hallNumber: Number(hallForm.hallNumber), totalFloors: Number(hallForm.totalFloors), capacity: Number(hallForm.capacity), blocks: hallForm.blocks.split(",").map((block) => block.trim()).filter(Boolean), availableRooms: 0, occupiedRooms: 0 };
      await api.post("/halls", payload);
      notify.success("Hall created successfully.");
      setHallForm(emptyHall);
      setShowHallForm(false);
      await loadData();
    } catch (saveError) {
      notify.error(saveError.response?.data?.message || "Failed to create hall.");
    } finally { setSaving(false); }
  };

  const editHall = async (hall) => {
    const hallName = window.prompt("Hall name", hall.hallName);
    if (hallName === null) return;
    try { await api.patch(`/halls/${hall._id}`, { hallName: hallName.trim() }); notify.success("Hall updated successfully."); await loadData(); }
    catch (saveError) { notify.error(saveError.response?.data?.message || "Failed to update hall."); }
  };

  const toggleHall = async (hall) => {
    try { await api.patch(`/halls/${hall._id}`, { isActive: !hall.isActive }); await loadData(); }
    catch (saveError) { notify.error(saveError.response?.data?.message || "Failed to update hall status."); }
  };

  const removeHall = async (hall) => {
    if (!window.confirm(`Delete Hall ${hall.hallNumber}?`)) return;
    try { await api.delete(`/halls/${hall._id}`); notify.success("Hall deleted successfully."); await loadData(); }
    catch (deleteError) { notify.error(deleteError.response?.data?.message || "Failed to delete hall."); }
  };

  if (loading) return <div className="admin-halls-loading"><div className="spinner-border" role="status" /></div>;

  return (
    <div className="admin-halls-page">
      <div className="admin-halls-header">
        <div><h1>Hall Management</h1><p>Manage halls, blocks, floors, and rooms.</p></div>
        <button className="admin-halls-primary" type="button" onClick={() => setShowHallForm(true)}>+ Add Hall</button>
      </div>

      <section className="admin-halls-filters">
        <div><label htmlFor="hall-search">Search</label><input id="hall-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Hall name" /></div>
        <div><label htmlFor="hall-number-filter">Hall</label><select id="hall-number-filter" value={hallFilter} onChange={(event) => setHallFilter(event.target.value)}><option value="All">All halls</option>{allHallOptions.map(([hallNumber, hallName]) => <option key={hallNumber} value={hallNumber}>Hall {hallNumber} - {hallName}</option>)}</select></div>
        <div><label htmlFor="hall-gender-filter">Gender</label><select id="hall-gender-filter" value={genderFilter} onChange={(event) => setGenderFilter(event.target.value)}><option value="All">All genders</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
        <button className="admin-halls-clear" type="button" onClick={() => { setSearch(""); setHallFilter("All"); setGenderFilter("All"); }}>Clear</button>
      </section>

      <div className="admin-halls-grid">
        {filteredHalls.map((hall) => {
          return <article className="admin-hall-card" key={hall._id}>
            <div className="admin-hall-card-top"><div><span className="admin-hall-number">Hall {hall.hallNumber}</span><h2>{hall.hallName}</h2><p>{hall.gender} hostel{hall.shortName ? ` · ${hall.shortName}` : ""}</p></div><span className="admin-hall-capacity">{hall.capacity} beds</span></div>
            <div className="admin-hall-stats"><span><strong>{hall.availableRooms || 0}</strong> rooms</span><span><strong>{hall.blocks?.length || 0}</strong> blocks</span><span><strong>{hall.totalFloors}</strong> floors</span></div>
            <div className="admin-hall-actions"><button type="button" onClick={() => editHall(hall)}>Edit</button><button type="button" onClick={() => toggleHall(hall)}>{hall.isActive ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => removeHall(hall)}>Delete</button></div>
          </article>;
        })}
      </div>

      {showHallForm && <div className="admin-halls-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowHallForm(false)}>
        {showHallForm && <form className="admin-halls-modal" onSubmit={createHall}><div className="admin-halls-modal-heading"><div><h2>Add Hall</h2><p>Create the hall before adding its rooms.</p></div><button type="button" onClick={() => setShowHallForm(false)}>&times;</button></div><div className="admin-halls-form-grid"><label>Hall number<input name="hallNumber" type="number" value={hallForm.hallNumber} onChange={updateHallForm} required /></label><label>Hall name<input name="hallName" value={hallForm.hallName} onChange={updateHallForm} required /></label><label>Short name<input name="shortName" value={hallForm.shortName} onChange={updateHallForm} /></label><label>Gender<select name="gender" value={hallForm.gender} onChange={updateHallForm}><option>Male</option><option>Female</option></select></label><label>Total floors<input name="totalFloors" type="number" min="1" value={hallForm.totalFloors} onChange={updateHallForm} required /></label><label>Blocks<input name="blocks" value={hallForm.blocks} onChange={updateHallForm} placeholder="South, Central, Extension" /></label><label>Capacity<input name="capacity" type="number" min="1" value={hallForm.capacity} onChange={updateHallForm} required /></label><label className="admin-halls-full">Description<textarea name="description" value={hallForm.description} onChange={updateHallForm} /></label></div><div className="admin-halls-modal-actions"><button type="button" className="admin-halls-clear" onClick={() => setShowHallForm(false)}>Cancel</button><button className="admin-halls-primary" disabled={saving}>{saving ? "Creating..." : "Create Hall"}</button></div></form>}
      </div>}
    </div>
  );
}

export default AdminHalls;
