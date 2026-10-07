import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { getWardenFines } from "../services/fineService";
import "./WardenRooms.css";

const statusClass = (status) => status.toLowerCase().replaceAll(" ", "-");

function WardenRooms() {
  const [rooms, setRooms] = useState([]);
  const [fines, setFines] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("All");
  const [floorFilter, setFloorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    Promise.all([api.get("/rooms/warden"), getWardenFines()])
      .then(([roomResponse, fineResponse]) => {
        setRooms(roomResponse.data.rooms || []);
        setFines(fineResponse.data.fines || []);
      })
      .catch((loadError) => setError(loadError.response?.data?.message || "Failed to load rooms."))
      .finally(() => setLoading(false));
  }, []);

  const blocks = useMemo(() => [...new Set(rooms.map((room) => room.block).filter(Boolean))].sort(), [rooms]);
  const floors = useMemo(() => [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b), [rooms]);
  const finesByStudent = useMemo(() => fines.reduce((groups, fine) => {
    const studentId = fine.studentId?._id || fine.studentId;
    if (studentId) groups[studentId] = [...(groups[studentId] || []), fine];
    return groups;
  }, {}), [fines]);
  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const query = search.trim().toLowerCase();
    return (blockFilter === "All" || room.block === blockFilter)
      && (floorFilter === "All" || String(room.floor) === floorFilter)
      && (statusFilter === "All" || room.status === statusFilter)
      && (!query || `${room.roomNumber} ${room.block}`.toLowerCase().includes(query));
  }), [rooms, search, blockFilter, floorFilter, statusFilter]);

  const getRoomFines = (room) => room.occupants?.flatMap((student) => finesByStudent[student._id] || []) || [];
  const clearFilters = () => { setSearch(""); setBlockFilter("All"); setFloorFilter("All"); setStatusFilter("All"); };

  if (loading) return <div className="warden-rooms-loading"><div className="spinner-border" role="status" /></div>;

  return <div className="warden-rooms-page">
    <header className="warden-rooms-header"><div><span className="warden-rooms-kicker">HALL OPERATIONS</span><h1>Rooms</h1><p>Open a room to review its residents and fines.</p></div><strong>{filteredRooms.length} of {rooms.length} rooms</strong></header>
    {error && <div className="alert alert-danger">{error}</div>}
    <section className="warden-rooms-filters"><div className="warden-rooms-field warden-rooms-search"><label htmlFor="warden-room-search">Search room</label><input id="warden-room-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Room number or block" /></div><div className="warden-rooms-field"><label htmlFor="warden-room-block">Block</label><select id="warden-room-block" value={blockFilter} onChange={(event) => setBlockFilter(event.target.value)}><option value="All">All blocks</option>{blocks.map((block) => <option key={block}>{block}</option>)}</select></div><div className="warden-rooms-field"><label htmlFor="warden-room-floor">Floor</label><select id="warden-room-floor" value={floorFilter} onChange={(event) => setFloorFilter(event.target.value)}><option value="All">All floors</option>{floors.map((floor) => <option key={floor} value={floor}>{floor === 0 ? "Ground" : floor}</option>)}</select></div><div className="warden-rooms-field"><label htmlFor="warden-room-status">Status</label><select id="warden-room-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="All">All statuses</option><option>Available</option><option>Partially Occupied</option><option>Full</option><option>Under Maintenance</option></select></div><button className="warden-rooms-clear" type="button" onClick={clearFilters}>Clear</button></section>
    <div className="warden-room-grid">{filteredRooms.length === 0 ? <div className="warden-rooms-empty">No rooms match the selected filters.</div> : filteredRooms.map((room) => { const roomFines = getRoomFines(room); const totalFine = roomFines.reduce((total, fine) => total + Number(fine.amount || 0), 0); return <button className="warden-room-card" type="button" key={room._id} onClick={() => setSelectedRoom(room)}><div className="warden-room-card-top"><span className="warden-room-number">Room {room.roomNumber}</span><span className={`warden-room-status status-${statusClass(room.status)}`}>{room.status}</span></div><p>{room.block} block · {room.floor === 0 ? "Ground floor" : `Floor ${room.floor}`}</p><div className="warden-room-card-stats"><span><strong>{room.occupants?.length || 0}</strong> / {room.capacity} residents</span><span><strong>₹{totalFine.toLocaleString("en-IN")}</strong> fines</span></div><span className="warden-room-card-link">View residents</span></button>; })}</div>
    {selectedRoom && <RoomDetails room={selectedRoom} fines={finesByStudent} onClose={() => setSelectedRoom(null)} />}
  </div>;
}

function RoomDetails({ room, fines, onClose }) {
  const occupants = room.occupants || [];
  const roomFines = occupants.flatMap((student) => fines[student._id] || []);
  const totalFine = roomFines.reduce((total, fine) => total + Number(fine.amount || 0), 0);
  return <div className="warden-room-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="warden-room-details" role="dialog" aria-modal="true" aria-labelledby="room-details-title"><div className="warden-room-details-header"><div><span className="warden-rooms-kicker">ROOM DETAIL</span><h2 id="room-details-title">Room {room.roomNumber}</h2><p>{room.block} block · {room.floor === 0 ? "Ground floor" : `Floor ${room.floor}`}</p></div><button className="warden-room-close" type="button" aria-label="Close room details" onClick={onClose}>×</button></div><div className="warden-room-summary"><span><strong>{occupants.length}</strong> residents</span><span><strong>₹{totalFine.toLocaleString("en-IN")}</strong> total fines</span><span><strong>{roomFines.length}</strong> fine records</span></div><div className="warden-room-residents">{occupants.length === 0 ? <p className="warden-rooms-empty">No students are assigned to this room.</p> : occupants.map((student) => { const studentFines = fines[student._id] || []; const studentTotal = studentFines.reduce((total, fine) => total + Number(fine.amount || 0), 0); return <article className="warden-room-resident" key={student._id}><div><h3>{student.name}</h3><p>{student.registrationNo || "No registration number"} · {student.branch || student.department || "Department unavailable"}</p></div><div className="warden-room-resident-fine"><strong>₹{studentTotal.toLocaleString("en-IN")}</strong><span>{studentFines.length === 1 ? "1 fine" : `${studentFines.length} fines`}</span></div></article>; })}</div></section></div>;
}

export default WardenRooms;