import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import notify from "../utils/toast";
import "./WardenStudents.css";

const departments = [
  ["BT", "Biotechnology"],
  ["CE", "Civil Engineering"],
  ["CH", "Chemical Engineering"],
  ["CS", "Computer Science & Engineering"],
  ["EC", "Electronics & Communication Engineering"],
  ["EE", "Electrical Engineering"],
  ["ME", "Mechanical Engineering"],
  ["MM", "Metallurgical & Materials Engineering"],
  ["CY", "Chemistry"],
  ["PH", "Physics"],
  ["MA", "Mathematics"],
  ["ES", "Earth & Environmental Studies"],
  ["HS", "Humanities & Social Sciences"],
  ["MS", "Management Studies"],
];

const blocks = ["Main", "South", "Central", "Extension"];
const floors = Array.from({ length: 13 }, (_, floor) => floor);

function WardenStudents() {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [block, setBlock] = useState("All");
  const [floor, setFloor] = useState("All");
  const [allocationStudent, setAllocationStudent] = useState(null);
  const [allocationRoom, setAllocationRoom] = useState("");
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationError, setAllocationError] = useState("");
  const [lotteryRoom, setLotteryRoom] = useState(null);
  const [lotteryLoading, setLotteryLoading] = useState(false);
  const [allocationBlock, setAllocationBlock] = useState("All");
  const [lotteryFloor, setLotteryFloor] = useState("All");

  useEffect(() => {
    Promise.all([api.get("/users/warden/students"), api.get("/rooms/warden")])
      .then(([studentResponse, roomResponse]) => { setStudents(studentResponse.data.students || []); setRooms(roomResponse.data.rooms || []); })
      .catch((loadError) => notify.error(loadError.response?.data?.message || "Failed to load students."))
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const query = search.trim().toLowerCase();
    const searchable = [student.name, student.registrationNo, student.email, student.branch].map((value) => String(value || "").toLowerCase());
    return (department === "All" || student.department === department)
      && (block === "All" || student.roomId?.block === block)
      && (floor === "All" || String(student.roomId?.floor) === floor)
      && (!query || searchable.some((value) => value.includes(query)));
  }), [students, search, department, block, floor]);

  const clearFilters = () => { setSearch(""); setDepartment("All"); setBlock("All"); setFloor("All"); };

  const availableRooms = rooms.filter((room) => room.status !== "Under Maintenance" && (room.occupants?.length || 0) < room.capacity && (allocationBlock === "All" || room.block === allocationBlock) && (lotteryFloor === "All" || String(room.floor) === lotteryFloor));
  const closeAllocation = () => { setAllocationStudent(null); setAllocationRoom(""); setLotteryRoom(null); setAllocationBlock("All"); setLotteryFloor("All"); setAllocationError(""); };
  const assignRoom = async (event) => {
    event.preventDefault();
    setAllocationLoading(true);
    setAllocationError("");
    try {
      const response = await api.patch(`/rooms/warden/${allocationRoom}/assign`, { studentId: allocationStudent._id });
      setStudents((current) => current.map((student) => student._id === allocationStudent._id ? { ...student, roomId: response.data.student.roomId } : student));
      setRooms((current) => current.map((room) => room._id === allocationRoom ? { ...room, occupants: [...(room.occupants || []), allocationStudent._id], status: room.occupants.length + 1 >= room.capacity ? "Full" : "Partially Occupied" } : room));
      notify.success(`Room assigned to ${allocationStudent.name} successfully.`);
      closeAllocation();
    } catch (saveError) {
      notify.error(saveError.response?.data?.message || "Failed to assign room.");
    } finally {
      setAllocationLoading(false);
    }
  };

  const previewLottery = async () => {
    setLotteryLoading(true);
    setAllocationError("");
    try {
      const response = await api.post("/rooms/warden/lottery/preview", { studentId: allocationStudent._id, floor: lotteryFloor, block: allocationBlock });
      setLotteryRoom(response.data.room);
      setAllocationRoom(response.data.room._id);
    } catch (lotteryError) {
      notify.error(lotteryError.response?.data?.message || "Failed to run room lottery.");
    } finally {
      setLotteryLoading(false);
    }
  };

  if (loading) return <div className="warden-students-loading"><div className="spinner-border" role="status" /></div>;

  return <div className="warden-students-page">
    <header className="warden-students-header"><div><span className="warden-students-kicker">HALL STUDENTS</span><h1>Students</h1><p>View students assigned to your hall.</p></div><strong>{filteredStudents.length} of {students.length} students</strong></header>
    <section className="warden-students-filters"><div className="warden-students-field warden-students-search"><label htmlFor="warden-student-search">Search</label><input id="warden-student-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, registration, email, branch" /></div><div className="warden-students-field"><label htmlFor="warden-student-department">Department</label><select id="warden-student-department" value={department} onChange={(event) => setDepartment(event.target.value)}><option value="All">All departments</option>{departments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="warden-students-field"><label htmlFor="warden-student-block">Block</label><select id="warden-student-block" value={block} onChange={(event) => setBlock(event.target.value)}><option value="All">All blocks</option>{blocks.map((value) => <option key={value}>{value}</option>)}</select></div><div className="warden-students-field"><label htmlFor="warden-student-floor">Floor</label><select id="warden-student-floor" value={floor} onChange={(event) => setFloor(event.target.value)}><option value="All">All floors</option>{floors.map((value) => <option key={value} value={value}>{value === 0 ? "Ground" : `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} floor`}</option>)}</select></div><button className="warden-students-clear" type="button" onClick={clearFilters}>Clear</button></section>
    <div className="warden-students-table-wrap"><table className="warden-students-table"><thead><tr><th>Student</th><th>Registration No.</th><th>Department</th><th>Branch</th><th>Year</th><th>Room</th><th>Block</th><th>Floor</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredStudents.length === 0 ? <tr><td colSpan="10" className="warden-students-empty">No students match the selected filters.</td></tr> : filteredStudents.map((student) => <tr key={student._id}><td><strong>{student.name}</strong><small>{student.email || "No email"}</small></td><td>{student.registrationNo || "-"}</td><td>{student.department || "-"}</td><td>{student.branch || "-"}</td><td>{student.currentYear || "-"}</td><td>{student.roomId?.roomNumber || "Unassigned"}</td><td>{student.roomId?.block || "-"}</td><td>{student.roomId ? student.roomId.floor === 0 ? "Ground" : student.roomId.floor : "-"}</td><td><span className={`warden-student-status ${student.isActive ? "active" : "inactive"}`}>{student.isActive ? "Active" : "Inactive"}</span></td><td>{student.roomId ? <span className="warden-student-assigned">Assigned</span> : <button className="warden-student-assign" type="button" onClick={() => { setAllocationStudent(student); setAllocationBlock("All"); setLotteryFloor("All"); setAllocationError(""); }}>Assign room</button>}</td></tr>)}</tbody></table></div>
    {allocationStudent && <div className="warden-students-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeAllocation()}><form className="warden-students-modal" onSubmit={assignRoom}><div className="warden-students-modal-header"><div><h2>Assign room</h2><p>{allocationStudent.name} · {allocationStudent.registrationNo}</p></div><button type="button" onClick={closeAllocation} aria-label="Close">&times;</button></div>{allocationError && <div className="alert alert-danger">{allocationError}</div>}<label className="warden-students-modal-field">Block<select value={allocationBlock} onChange={(event) => { setAllocationBlock(event.target.value); setAllocationRoom(""); setLotteryRoom(null); }}><option value="All">All blocks</option>{[...new Set(rooms.map((room) => room.block).filter(Boolean))].sort().map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="warden-students-modal-field">Lottery floor<select value={lotteryFloor} onChange={(event) => { setLotteryFloor(event.target.value); setAllocationRoom(""); setLotteryRoom(null); }}><option value="All">Any floor</option>{[...new Set(rooms.filter((room) => allocationBlock === "All" || room.block === allocationBlock).map((room) => room.floor))].sort((a, b) => a - b).map((value) => <option key={value} value={value}>{value === 0 ? "Ground floor" : `Floor ${value}`}</option>)}</select></label><label className="warden-students-modal-field">Available room<select value={allocationRoom} onChange={(event) => { setAllocationRoom(event.target.value); setLotteryRoom(null); }} required><option value="">Select room manually</option>{availableRooms.map((room) => <option key={room._id} value={room._id}>Room {room.roomNumber} · {room.block} · {room.floor === 0 ? "Ground" : `Floor ${room.floor}`} · {room.occupants?.length || 0}/{room.capacity}</option>)}</select></label>{lotteryRoom && <div className="warden-students-lottery-result"><strong>Lottery suggestion</strong><span>Room {lotteryRoom.roomNumber} · {lotteryRoom.block} · {lotteryRoom.floor === 0 ? "Ground" : `Floor ${lotteryRoom.floor}`} · {lotteryRoom.occupants}/{lotteryRoom.capacity}</span><small>Partially filled rooms are prioritized. Empty rooms are used only when no partially filled room is available on the selected block and floor.</small></div>}<div className="warden-students-modal-actions"><button type="button" className="warden-students-lottery" onClick={previewLottery} disabled={lotteryLoading}>{lotteryLoading ? "Drawing..." : "Run lottery"}</button><button type="button" className="warden-students-clear" onClick={closeAllocation}>Cancel</button><button type="submit" className="warden-student-assign" disabled={allocationLoading}>{allocationLoading ? "Assigning..." : lotteryRoom ? "Accept lottery" : "Assign room"}</button></div></form></div>}
  </div>;
}

export default WardenStudents;
