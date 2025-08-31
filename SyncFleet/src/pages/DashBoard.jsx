import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { getSocket } from "../utils/socket";
import API from "../utils/axios.js";
import { MY_ROOM } from "@/utils/constant.js";
import RoomMap from "./RoomMap";

const Dashboard = () => {
  const navigate = useNavigate();
  const [myRooms, setMyRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {

    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await API.get(MY_ROOM, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMyRooms(res.data.rooms || []);
      } catch (err) {
        console.error("❌ Failed to fetch rooms:", err.message);
      }
    };

    fetchRooms();
  }, []);
    
  const handleJoinRoom = async (roomCode) => {
  setActiveRoom(roomCode);
  navigate(`/room/${roomCode}/map`);
};

  

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200">
      {/* Navbar */}
      <nav className="bg-white shadow-md py-4 px-8 border-b border-gray-100">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <span className="text-2xl font-black bg-gradient-to-r from-gray-700 via-gray-900 to-black bg-clip-text text-transparent">
            SyncFleet
          </span>
          <div className="space-x-2">
            <button
              onClick={() => navigate("/")}
              className="text-gray-800 font-medium hover:text-black transition px-2"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/my-rooms")}
              className="text-gray-800 font-medium hover:text-black transition px-2"
            >
              My Rooms
            </button>
            <button
              onClick={() => navigate("/logout")}
              className="bg-gradient-to-r from-black via-gray-800 to-gray-900 text-white px-4 py-1 rounded hover:from-gray-700 hover:to-black text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-gradient-to-b from-white via-gray-50 to-gray-100 py-10 flex-grow">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-black to-gray-600 mb-4">
            Welcome to SyncFleet Dashboard
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Create or Join a Room to start tracking your team in real time.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => navigate("/create-room")}
              className="bg-gradient-to-r from-black via-gray-800 to-gray-900 text-white px-6 py-2 rounded-md text-lg font-semibold hover:from-gray-700 hover:to-black transition"
            >
              ➕ Create Room
            </button>
            <button
              onClick={() => navigate("/join-room")}
              className="text-gray-900 border border-gray-800 px-6 py-2 rounded-md text-lg font-semibold hover:bg-gray-100 transition"
            >
              🔗 Join Room
            </button>
          </div>
        </div>
      </header>

      {/* Room List & Map */}
      <section className="max-w-6xl mx-auto my-12 px-4 w-full">
  <h2 className="text-2xl font-semibold mb-4 text-gray-900">My Rooms</h2>
  {myRooms.length === 0 ? (
    <p className="text-gray-500 text-center">
      You haven't joined or created any rooms yet.
    </p>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {myRooms.map(room => (
        <div
          key={room._id}
          className="bg-white border border-gray-200 rounded-xl shadow hover:shadow-md transition p-6 flex flex-col justify-between cursor-pointer"
          onClick={() => handleJoinRoom(room.code)}
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block bg-gray-100 text-gray-700 p-2 rounded-full">
                {/* Map Icon Example (can use react-icons): */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 20V6l6-2v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="inline-block font-semibold text-lg text-gray-900">{room.name || room.code}</span>
            </div>
            <div className="text-sm text-gray-500 mb-1">
              {room.members ? `${room.members.length} Members` : "— Members"}
            </div>
            <div className="text-xs text-gray-400">
              Last Active:
              {room.lastActive 
                ? ` ${room.lastActive}` 
                : " Unknown"}
            </div>
          </div>
          <button
            className={`mt-6 w-full rounded-lg py-2 font-semibold transition 
              ${
                activeRoom === room.code
                  ? "bg-gray-900 text-white"
                  : "bg-gradient-to-r from-black via-gray-800 to-gray-900 text-white hover:from-gray-700 hover:to-black"
              }
            `}
          >
            {activeRoom === room.code ? "✅ Joined" : "Join"}
          </button>
        </div>
      ))}
    </div>
  )}
</section>


      {/* Footer */}
      <footer className="bg-white text-gray-500 text-sm text-center py-4 mt-auto border-t border-gray-100">
        © {new Date().getFullYear()} SyncFleet. All rights reserved.
      </footer>
    </div>
  );
};

export default Dashboard;
