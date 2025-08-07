import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/axios.js";
import { CREATE_ROOM } from "@/utils/constant";

const CreateRoom = () => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setLoading(true);
    setResponse("");
    try {
      const res = await API.post(CREATE_ROOM, { source, destination });
      setResponse("Room Created: " + res.data.roomCode);
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err) {
      setResponse("Error: " + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-100 to-gray-200">
      <div className="bg-white shadow-xl rounded-lg px-8 py-8 w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-black to-gray-600 text-center">
          Create New Room
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="source">
              Source
            </label>
            <input
              id="source"
              type="text"
              placeholder="Source location"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded border border-gray-300 py-2 px-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="destination">
              Destination
            </label>
            <input
              id="destination"
              type="text"
              placeholder="Destination location"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded border border-gray-300 py-2 px-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition"
              autoComplete="off"
            />
          </div>
          <button
            onClick={handleCreateRoom}
            disabled={loading || !source || !destination}
            className="w-full mt-3 bg-gradient-to-r from-black via-gray-800 to-gray-900 text-white py-2 rounded font-semibold hover:from-gray-700 hover:to-black transition disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>
          {response && (
            <div
              className={`mt-3 text-center px-3 py-2 rounded-lg text-sm
                ${response.startsWith("Room Created")
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

export default CreateRoom;
