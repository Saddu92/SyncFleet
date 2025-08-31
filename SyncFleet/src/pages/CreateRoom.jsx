import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/axios.js";
import { CREATE_ROOM } from "@/utils/constant";

const CreateRoom = () => {
  const [sourceQuery, setSourceQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [sourceSuggestions, setSourceSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [source, setSource] = useState(null); // { display_name, lat, lon }
  const [destination, setDestination] = useState(null); // { display_name, lat, lon }
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const navigate = useNavigate();

  // 🔹 Fetch suggestions (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceQuery.length > 2) {
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            sourceQuery
          )}`
        )
          .then((res) => res.json())
          .then((data) => setSourceSuggestions(data.slice(0, 5)))
          .catch(() => setSourceSuggestions([]));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [sourceQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (destinationQuery.length > 2) {
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            destinationQuery
          )}`
        )
          .then((res) => res.json())
          .then((data) => setDestinationSuggestions(data.slice(0, 5)))
          .catch(() => setDestinationSuggestions([]));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [destinationQuery]);

  // 🔹 Handle room creation
  const handleCreateRoom = async () => {
    if (!source || !destination) {
      setResponse("Please select valid Source and Destination from suggestions.");
      return;
    }
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
          {/* Source Input */}
          <div className="relative">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="source">
              Source
            </label>
            <input
              id="source"
              type="text"
              placeholder="Search source location"
              value={sourceQuery}
              onChange={(e) => {
                setSourceQuery(e.target.value);
                setSource(null);
              }}
              className="w-full rounded border border-gray-300 py-2 px-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition"
              autoComplete="off"
            />
            {sourceSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 w-full max-h-48 overflow-auto shadow-lg">
                {sourceSuggestions.map((place) => (
                  <li
                    key={place.place_id}
                    onClick={() => {
                      setSource({
                        displayName: place.display_name,
                        lat: place.lat,
                        lon: place.lon,
                      });
                      setSourceQuery(place.display_name);
                      setSourceSuggestions([]);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {place.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Destination Input */}
          <div className="relative">
            <label className="block text-gray-700 mb-1 font-medium" htmlFor="destination">
              Destination
            </label>
            <input
              id="destination"
              type="text"
              placeholder="Search destination location"
              value={destinationQuery}
              onChange={(e) => {
                setDestinationQuery(e.target.value);
                setDestination(null);
              }}
              className="w-full rounded border border-gray-300 py-2 px-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-500 transition"
              autoComplete="off"
            />
            {destinationSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 w-full max-h-48 overflow-auto shadow-lg">
                {destinationSuggestions.map((place) => (
                  <li
                    key={place.place_id}
                    onClick={() => {
                      setDestination({
                        displayName: place.display_name,
                        lat: place.lat,
                        lon: place.lon,
                      });
                      setDestinationQuery(place.display_name);
                      setDestinationSuggestions([]);
                    }}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {place.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleCreateRoom}
            disabled={loading || !source || !destination}
            className="w-full mt-3 bg-gradient-to-r from-black via-gray-800 to-gray-900 text-white py-2 rounded font-semibold hover:from-gray-700 hover:to-black transition disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Room"}
          </button>

          {/* Response */}
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
