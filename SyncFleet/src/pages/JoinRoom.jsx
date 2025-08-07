import React, { useState } from "react";
import API from "../utils/axios";
import { JOIN_ROOM } from "@/utils/constant";

const JoinRoom = () => {
  const [code, setCode] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoinRoom = async () => {
    setLoading(true);
    setResponse("");
    try {
      const res = await API.post(JOIN_ROOM, { code });
      setResponse("✅ " + res.data.message + " | Code: " + res.data.roomCode);
    } catch (err) {
      setResponse("❌ " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-100 to-gray-200">
      <div className="bg-white shadow-xl rounded-lg px-8 py-8 w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-black to-gray-600 text-center">
          Join Room
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter Room Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded border border-gray-300 py-2 px-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition"
            autoComplete="off"
          />
          <button
            onClick={handleJoinRoom}
            disabled={loading || !code}
            className="w-full bg-gradient-to-r from-black via-gray-800 to-gray-900 text-white py-2 rounded font-semibold hover:from-gray-700 hover:to-black transition disabled:opacity-60"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
          {response && (
            <div
              className={`mt-3 text-center px-3 py-2 rounded-lg text-sm
                ${response.startsWith("✅")
                  ? "bg-gray-900 text-white font-semibold"
                  : "bg-red-50 text-red-600 border border-red-200"}`}
            >
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;
