import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import notify from "../utils/toast";
import "./AdminRooms.css";

const emptyRoom = { hallId: "", block: "Main", floor: 0, roomNumber: "", capacity: 3 };
const emptyBulk = { hallId: "", block: "Main", roomPrefix: "", startFloor: 0, totalFloors: 1, roomsPerFloor: 10, roomCapacity: 3 };

function AdminRooms() {
  const [halls, setHalls] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hallFilter, setHallFilter] = useState("All");
  const [blockFilter, setBlockFilter] = useState("All");
  const [floorFilter, setFloorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [bulkForm, setBulkForm] = useState(emptyBulk);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [hallResponse, roomResponse] = await Promise.all([api.get("/halls"), api.get("/rooms")]);
      setHalls((hallResponse.data.halls || []).sort((a, b) => a.hallNumber - b.hallNumber));
      setRooms(roomResponse.data.rooms || []);
    } catch (loadError) {
      notify.error(loadError.response?.data?.message || "Failed to load rooms.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void Promise.resolve().then(loadData); }, []);

  const blocks = useMemo(() => [...new Set(rooms.map((room) => room.block).filter(Boolean))].sort(), [rooms]);
  const floors = useMemo(() => [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b), [rooms]);
  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const roomHallId = room.hallId?._id || room.hallId;
    const query = search.trim().toLowerCase();
    return (hallFilter === "All" || roomHallId === hallFilter)
      && (blockFilter === "All" || room.block === blockFilter)
      && (floorFilter === "All" || String(room.floor) === floorFilter)
      && (statusFilter === "All" || room.status === statusFilter)
      && (!query || String(room.roomNumber).toLowerCase().includes(query) || room.block.toLowerCase().includes(query));
  }), [rooms, hallFilter, blockFilter, floorFilter, statusFilter, search]);

  const updateForm = (setter) => (event) => setter((current) => ({ ...current, [event.target.name]: event.target.value }));
  const closeForms = () => { setShowRoomForm(false); setShowBulkForm(false); setRoomForm(emptyRoom); setBulkForm(emptyBulk); };
  const clearFilters = () => { setHallFilter("All"); setBlockFilter("All"); setFloorFilter("All"); setStatusFilter("All"); setSearch(""); };

  const editRoom = async (room) => {
    const status = window.prompt("Status", room.status);
    if (status === null) return;
    try { await api.patch(`/rooms/${room._id}`, { status }); notify.success("Room updated successfully."); await loadData(); }
    catch (saveError) { notify.error(saveError.response?.data?.message || "Failed to update room."); }
  };

  const removeRoom = async (room) => {
    if (!window.confirm(`Delete room ${room.roomNumber}?`)) return;
    try { await api.delete(`/rooms/${room._id}`); notify.success("Room deleted successfully."); await loadData(); }
    catch (deleteError) { notify.error(deleteError.response?.data?.message || "Failed to delete room."); }
  };

  const createRoom = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post("/rooms", { ...roomForm, floor: Number(roomForm.floor), capacity: Number(roomForm.capacity) });
      notify.success("Room created successfully."); closeForms(); await loadData();
    } catch (saveError) { notify.error(saveError.response?.data?.message || "Failed to create room."); }
    finally { setSaving(false); }
  };

  const generateRooms = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const response = await api.post("/rooms/generate", { ...bulkForm, startFloor: Number(bulkForm.startFloor), totalFloors: Number(bulkForm.totalFloors), roomsPerFloor: Number(bulkForm.roomsPerFloor), roomCapacity: Number(bulkForm.roomCapacity) });
      notify.success(`${response.data.count} rooms generated successfully.`); closeForms(); await loadData();
    } catch (saveError) { notify.error(saveError.response?.data?.message || "Failed to generate rooms."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="admin-rooms-loading"><div className="spinner-border" role="status" /></div>;

  return <div className="admin-rooms-page">
    <div className="admin-rooms-header"><div><h1>Room Management</h1><p>View and manage rooms across all halls.</p></div><div className="admin-rooms-header-actions"><strong>{filteredRooms.length} of {rooms.length} rooms</strong><button className="admin-rooms-primary" type="button" onClick={() => setShowRoomForm(true)}>+ Add Room</button><button className="admin-rooms-secondary" type="button" onClick={() => setShowBulkForm(true)}>+ Add Rooms in Bulk</button></div></div>
    <section className="admin-rooms-filters"><div className="admin-rooms-field admin-rooms-search"><label htmlFor="room-search">Search room</label><input id="room-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Room number or block" /></div><div className="admin-rooms-field"><label htmlFor="room-hall">Hall</label><select id="room-hall" value={hallFilter} onChange={(event) => setHallFilter(event.target.value)}><option value="All">All halls</option>{halls.map((hall) => <option key={hall._id} value={hall._id}>Hall {hall.hallNumber}</option>)}</select></div><div className="admin-rooms-field"><label htmlFor="room-block">Block</label><select id="room-block" value={blockFilter} onChange={(event) => setBlockFilter(event.target.value)}><option value="All">All blocks</option>{blocks.map((block) => <option key={block}>{block}</option>)}</select></div><div className="admin-rooms-field"><label htmlFor="room-floor">Floor</label><select id="room-floor" value={floorFilter} onChange={(event) => setFloorFilter(event.target.value)}><option value="All">All floors</option>{floors.map((floor) => <option key={floor} value={floor}>{floor === 0 ? "Ground" : floor}</option>)}</select></div><div className="admin-rooms-field"><label htmlFor="room-status">Status</label><select id="room-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="All">All statuses</option><option>Available</option><option>Partially Occupied</option><option>Full</option><option>Under Maintenance</option></select></div><button className="admin-rooms-clear" type="button" onClick={clearFilters}>Clear</button></section>
    <div className="admin-rooms-table-wrap"><table className="admin-rooms-table"><thead><tr><th>Room</th><th>Hall</th><th>Block</th><th>Floor</th><th>Capacity</th><th>Occupied</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredRooms.length === 0 ? <tr><td colSpan="8" className="admin-rooms-empty">No rooms match the selected filters.</td></tr> : filteredRooms.map((room) => <tr key={room._id}><td><strong>{room.roomNumber}</strong></td><td>{room.hallId ? `Hall ${room.hallId.hallNumber} - ${room.hallId.hallName}` : "Unassigned"}</td><td>{room.block}</td><td>{room.floor === 0 ? "Ground" : room.floor}</td><td>{room.capacity}</td><td>{room.occupants?.length || 0}</td><td><span className={`admin-room-status status-${room.status.toLowerCase().replaceAll(" ", "-")}`}>{room.status}</span></td><td><div className="admin-room-actions"><button type="button" onClick={() => editRoom(room)}>Edit</button><button type="button" onClick={() => removeRoom(room)}>Delete</button></div></td></tr>)}</tbody></table></div>
    {(showRoomForm || showBulkForm) && <div className="admin-rooms-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeForms()}>{showRoomForm && <form className="admin-rooms-modal" onSubmit={createRoom}><h2>Add Room</h2><p>Create one room manually.</p><div className="admin-rooms-form-grid"><label>Hall<select name="hallId" value={roomForm.hallId} onChange={updateForm(setRoomForm)} required><option value="">Select hall</option>{halls.map((hall) => <option key={hall._id} value={hall._id}>Hall {hall.hallNumber} - {hall.hallName}</option>)}</select></label><label>Block<input name="block" value={roomForm.block} onChange={updateForm(setRoomForm)} required /></label><label>Room number<input name="roomNumber" value={roomForm.roomNumber} onChange={updateForm(setRoomForm)} placeholder="SB101" required /></label><label>Floor<input name="floor" type="number" min="0" value={roomForm.floor} onChange={updateForm(setRoomForm)} required /></label><label>Capacity<input name="capacity" type="number" min="1" value={roomForm.capacity} onChange={updateForm(setRoomForm)} required /></label></div><ModalActions saving={saving} onCancel={closeForms} label="Create Room" /></form>}{showBulkForm && <form className="admin-rooms-modal" onSubmit={generateRooms}><h2>Add Rooms in Bulk</h2><p>Generate a complete block or floor range at once.</p><div className="admin-rooms-form-grid"><label>Hall<select name="hallId" value={bulkForm.hallId} onChange={updateForm(setBulkForm)} required><option value="">Select hall</option>{halls.map((hall) => <option key={hall._id} value={hall._id}>Hall {hall.hallNumber} - {hall.hallName}</option>)}</select></label><label>Block<input name="block" value={bulkForm.block} onChange={updateForm(setBulkForm)} required /></label><label>Prefix<input name="roomPrefix" value={bulkForm.roomPrefix} onChange={updateForm(setBulkForm)} placeholder="SB, CB, EXT" /></label><label>Start floor<input name="startFloor" type="number" min="0" value={bulkForm.startFloor} onChange={updateForm(setBulkForm)} required /></label><label>Number of floors<input name="totalFloors" type="number" min="1" value={bulkForm.totalFloors} onChange={updateForm(setBulkForm)} required /></label><label>Rooms per floor<input name="roomsPerFloor" type="number" min="1" value={bulkForm.roomsPerFloor} onChange={updateForm(setBulkForm)} required /></label><label>Capacity per room<input name="roomCapacity" type="number" min="1" value={bulkForm.roomCapacity} onChange={updateForm(setBulkForm)} required /></label></div><ModalActions saving={saving} onCancel={closeForms} label="Generate Rooms" /></form>}</div>}
  </div>;
}

function ModalActions({ saving, onCancel, label }) { return <div className="admin-rooms-modal-actions"><button type="button" className="admin-rooms-clear" onClick={onCancel}>Cancel</button><button className="admin-rooms-primary" disabled={saving}>{saving ? "Saving..." : label}</button></div>; }

export default AdminRooms;
