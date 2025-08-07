import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useParams } from "react-router-dom";
import { getSocket, disconnectSocket } from "../utils/socket.js";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import haversine from "haversine-distance";
import { IoMdSend } from "react-icons/io";
import { IoLocationSharp, IoAlertCircle, IoExitOutline } from "react-icons/io5";
import { FiUsers, FiMessageSquare } from "react-icons/fi";
import "leaflet-polylinedecorator";
import useSound from "use-sound";
import notificationSound from "../assets/notification.mp3";

const STATIONARY_LIMIT = 5 * 60 * 1000; // 5 minutes
const MOVEMENT_THRESHOLD = 5; // meters
const INACTIVE_THRESHOLD = 30000; // 30 seconds
const PATH_HISTORY_LIMIT = 100;
const GEOLOCATION_TIMEOUT = 10000;
const DEFAULT_TRAIL_DURATION = 5; // minutes
const DEVIATION_THRESHOLD = 150; // meters
const SOS_DURATION = 30000; // 30 seconds

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

// Fix Leaflet default icon path
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

const cn = (...classes) => classes.filter(Boolean).join(" ");

const createPulsingIcon = (
  color = "#3b82f6",
  username = "",
  markerType = null
) => {
  let pulseColor = color;
  if (markerType === "stationary") pulseColor = "#ef4444";
  else if (markerType === "far") pulseColor = "#eab308";
  else if (markerType === "outside") pulseColor = "#f59e0b"; // orange

  return L.divIcon({
    className: "custom-pulse-icon",
    html: `
      <div class="relative">
        <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-white px-1 rounded text-xs font-medium whitespace-nowrap">${username}</div>
        ${
          markerType === "stationary"
            ? `<div class="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>`
            : markerType === "far"
            ? `<div class="absolute -top-3 -right-3 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>`
            : markerType === "outside"
            ? `<div class="absolute -top-3 -right-3 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">!</div>`
            : ""
        }
        <div class="pulse-marker" style="
          background: ${pulseColor}20;
          border-color: ${pulseColor};
        "></div>
        <div class="absolute-center" style="color: ${pulseColor};">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="currentColor" stroke-width="2">
            <circle cx="12" cy="10" r="5" fill="white" />
            <circle cx="12" cy="10" r="3" />
            <path d="M12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" fill="white" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const RecenterMap = React.memo(({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }
  }, [coords, map]);
  return null;
});

const DecoratedPolyline = React.memo(
  ({ positions, color, weight, dashArray, isAlert }) => {
    const map = useMap();
    useEffect(() => {
      if (!map || !positions || positions.length < 2) return;

      const polyline = L.polyline(
        positions.map((p) => [p.lat, p.lng]),
        {
          color: isAlert ? "#eab308" : color,
          weight,
          dashArray,
          className: "fading-trail",
        }
      ).addTo(map);

      const decorator = L.polylineDecorator(polyline, {
        patterns: [
          {
            offset: "100%",
            repeat: 0,
            symbol: L.Symbol.arrowHead({
              pixelSize: 10,
              pathOptions: {
                color: isAlert ? "#eab308" : color,
                fillOpacity: 1,
                weight: 0,
              },
            }),
          },
        ],
      }).addTo(map);

      return () => {
        map.removeLayer(decorator);
        map.removeLayer(polyline);
      };
    }, [map, positions, color, weight, dashArray, isAlert]);
    return null;
  }
);

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md p-4 bg-red-50 rounded-lg">
            <p className="text-red-500 text-lg">
              {this.state.error?.message || "Unknown error"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const RoomMap = () => {
  const { code: roomCode } = useParams();
  const socket = getSocket();
  const [playAlertSound] = useSound(notificationSound, { interrupt: true });
  const [toast, setToast] = useState(null);

  // User/Socket/Location states
  const [user, setUser] = useState(null);
  const [isUserReady, setIsUserReady] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Socket states
  const [isConnecting, setIsConnecting] = useState(false);
  const [mySocketId, setMySocketId] = useState(null);

  // Room states
  const [userLocations, setUserLocations] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [alertUsers, setAlertUsers] = useState(new Set());
  const [userTrails, setUserTrails] = useState({});
  const [trailDuration, setTrailDuration] = useState(DEFAULT_TRAIL_DURATION);
  const [geofence, setGeofence] = useState({
    center: null, radius: 300
  });

  // Refs
  const mapRef = useRef();
  const lastPositionRef = useRef(null);
  const lastMovedAtRef = useRef(Date.now());
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const stationaryCheckIntervalRef = useRef(null);
  const geolocationWatchId = useRef(null);
  const toastTimeoutRef = useRef(null);

  const trailExpiryMs = useMemo(
    () => trailDuration * 60 * 1000,
    [trailDuration]
  );

  // Toast helper
  const showToast = useCallback((message, type = "info") => {
    clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Disconnect handler
  const handleDisconnect = useCallback(() => {
    setIsConnecting(false);
    setMySocketId(null);
    showToast("Disconnected from server", "danger");
  }, [showToast]);

  // SOS
  const emitSOS = useCallback(() => {
    if (!socket.connected) {
      showToast("Cannot send SOS - disconnected from server", "danger");
      return;
    }
    const message = {
      type: "sos",
      content: `🚨 SOS Alert from ${user?.name || "User"}`,
      sender: user?.name || "You",
      timestamp: new Date().toISOString(),
    };
    socket.emit("chat-message", { roomCode, message });
    setMessages((prev) => [...prev, message]);
    setAlertUsers((prev) => {
      const newSet = new Set(prev);
      newSet.add(mySocketId);
      return newSet;
    });
    setUserLocations((prev) => ({
      ...prev,
      [mySocketId]: {
        ...(prev[mySocketId] || {}),
        isStationary: true,
      },
    }));
    setTimeout(() => {
      setAlertUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(mySocketId);
        return newSet;
      });
      setUserLocations((prev) => ({
        ...prev,
        [mySocketId]: {
          ...(prev[mySocketId] || {}),
          isStationary: false,
        },
      }));
    }, SOS_DURATION);
  }, [socket, roomCode, user, mySocketId, showToast]);

  // Geofence utility
  const isOutsideGeofence = (point, fence) => {
    if (!fence.center || !point) return false;
    const distance = haversine(point, fence.center);
    return distance > fence.radius;
  };

  // Stationary check
  const checkStationary = useCallback(
    (newCoords) => {
      const lastCoords = lastPositionRef.current;
      const now = Date.now();
      if (lastCoords) {
        const distance = haversine(lastCoords, newCoords);
        if (distance > MOVEMENT_THRESHOLD) {
          lastMovedAtRef.current = now;
          lastPositionRef.current = newCoords;
          setUserLocations((prev) => ({
            ...prev,
            [mySocketId]: { ...(prev[mySocketId] || {}), isStationary: false },
          }));
        } else if (now - lastMovedAtRef.current > STATIONARY_LIMIT) {
          emitSOS();
          lastMovedAtRef.current = now;
        }
      } else {
        lastPositionRef.current = newCoords;
        lastMovedAtRef.current = now;
      }
    },
    [emitSOS, mySocketId]
  );

  const emitLocationUpdate = useCallback(
    (coords) => {
      if (!user?.id || !user?.name || !socket.connected) {
        showToast("Cannot send location - disconnected from server or missing user info", "danger");
        return;
      }
      socket.emit(
        "location-update",
        {
          roomCode,
          coords,
          user: {
            id: user.id,
            name: user.name,
          },
        },
        (ack) => {
          if (ack?.error) {
            showToast("Failed to update location", "danger");
          }
        }
      );
    },
    [roomCode, socket, user, showToast]
  );

  // Load user on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          window.location.href = "/login";
          return;
        }
        const parsed = JSON.parse(storedUser);
        if (parsed?.id && parsed?.name) {
          setUser(parsed);
        } else {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
      } catch (e) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    };
    loadUser();
    setIsUserReady(true);
  }, []);

  // Start watching geolocation once user is loaded
  useEffect(() => {
    if (!isUserReady || !user) return;
    let timeoutId;
    const handleSuccess = (position) => {
      clearTimeout(timeoutId);
      const coords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setCoords(coords);
      checkStationary(coords);
      emitLocationUpdate(coords);
    };
    const handleError = (error) => {
      clearTimeout(timeoutId);
      let errorMessage = "Unable to get location.";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied. Please enable location permissions.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location unavailable. Please check your device settings.";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out. Please try again.";
          break;
        default:
          errorMessage = "An error occurred while getting your location.";
      }
      setLocationError(errorMessage);
      setCoords({ lat: 0, lng: 0 });
    };
    timeoutId = setTimeout(() => {
      handleError({ code: 3 });
    }, GEOLOCATION_TIMEOUT);
    if (navigator.geolocation) {
      geolocationWatchId.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          timeout: GEOLOCATION_TIMEOUT - 1000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
      setCoords({ lat: 0, lng: 0 });
    }
    return () => {
      clearTimeout(timeoutId);
      if (geolocationWatchId.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchId.current);
      }
    };
  }, [isUserReady, user, emitLocationUpdate, checkStationary]);

  // Set initial geofence center (change as needed for groupCenter)
  useEffect(() => {
    if (coords && !geofence.center) {
      setGeofence((prev) => ({
        ...prev,
        center: coords, // or you can use groupCenter if you prefer
        radius: 300
      }));
    }
  }, [coords, geofence.center]);

  // Socket connection handler
  useEffect(() => {
    if (!isUserReady || !user?.id) return;
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnecting(false);
      setMySocketId(socket.id);
      socket.emit("join-room", {
        roomCode,
        username: user.name,
        userId: user.id,
      });
    };
    const handleUserJoined = ({ username, socketId }) => {
      setActiveUsers((prev) => [
        ...prev.filter((u) => u.socketId !== socketId),
        { socketId, username },
      ]);
      showToast(`${username} joined the room`, "info");
    };
    const handleUserLeft = ({ socketId }) => {
      setUserLocations((prev) => {
        const newLocations = { ...prev };
        delete newLocations[socketId];
        return newLocations;
      });
      setActiveUsers((prev) => {
        const user = prev.find((u) => u.socketId === socketId);
        if (user) showToast(`${user.username} left the room`, "info");
        return prev.filter((u) => u.socketId !== socketId);
      });
      setAlertUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    };
    const handleLocationUpdate = ({ socketId, username, coords }) => {
      const now = Date.now();
      setUserLocations((prev) => {
        const existing = prev[socketId] || {};
        const filteredPath = [
          ...(existing.path || []),
          { ...coords, timestamp: now },
        ]
          .filter((p) => now - p.timestamp <= trailExpiryMs)
          .slice(-PATH_HISTORY_LIMIT);
        return {
          ...prev,
          [socketId]: {
            ...existing,
            username,
            coords,
            lastSeen: now,
            path: filteredPath,
            // Do NOT clear isStationary here
          },
        };
      });
      setUserTrails((prev) => ({
        ...prev,
        [socketId]: [...(prev[socketId] || []), { ...coords, timestamp: now }]
          .filter((p) => now - p.timestamp <= trailExpiryMs)
          .slice(-PATH_HISTORY_LIMIT),
      }));
    };
    // SOS/anomaly from others
    const handleAnomalyAlert = (data) => {
      const { socketId, username, type } = data;
      playAlertSound();
      const alertType = type === "sos" ? "danger" : "warning";
      showToast(
        type === "sos"
          ? `🚨 SOS triggered by ${username}`
          : `⚠️ ${username} deviated from group`,
        alertType
      );
      setAlertUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(socketId);
        return newSet;
      });
      // If anomaly is a stationary SOS, mark user as stationary!
      if (type === "sos") {
        setUserLocations((prev) => ({
          ...prev,
          [socketId]: { ...(prev[socketId] || {}), isStationary: true },
        }));
        setTimeout(() => {
          setUserLocations((prev) => ({
            ...prev,
            [socketId]: { ...(prev[socketId] || {}), isStationary: false },
          }));
        }, SOS_DURATION);
      }
      setTimeout(() => {
        setAlertUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(socketId);
          return newSet;
        });
      }, SOS_DURATION);
      setMessages((prev) => [
        ...prev,
        {
          type: "anomaly",
          sender: "System",
          content:
            type === "sos"
              ? `🚨 SOS Alert from ${username}`
              : `⚠️ ${username} is ${Math.round(
                  data.distance
                )}m away from the group!`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    const handleRoomMessage = ({ from, message }) => {
      if (message.type === "sos" && from !== socket.id) {
        playAlertSound();
        showToast(`🚨 SOS triggered by ${message.sender}`, "danger");
        setAlertUsers((prev) => {
          const newSet = new Set(prev);
          newSet.add(from);
          return newSet;
        });
        setUserLocations((prev) => ({
          ...prev,
          [from]: { ...(prev[from] || {}), isStationary: true },
        }));
        setTimeout(() => {
          setAlertUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(from);
            return newSet;
          });
          setUserLocations((prev) => ({
            ...prev,
            [from]: { ...(prev[from] || {}), isStationary: false },
          }));
        }, SOS_DURATION);
      }
      if (from !== socket.id) {
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            sender:
              message.sender || userLocations[from]?.username || "Unknown",
          },
        ]);
      }
    };
    const handleRoomUsers = (users) => {
      setActiveUsers(users);
    };

    if (!socket.connected) {
      setIsConnecting(true);
      socket.connect();
    }
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("location-update", handleLocationUpdate);
    socket.on("anomaly-alert", handleAnomalyAlert);
    socket.on("room-message", handleRoomMessage);
    socket.on("room-users", handleRoomUsers);

    stationaryCheckIntervalRef.current = setInterval(() => {
      setUserLocations((prev) => {
        const now = Date.now();
        const updated = {};
        Object.entries(prev).forEach(([socketId, data]) => {
          const filteredPath = (data.path || []).filter(
            (p) => now - p.timestamp <= trailExpiryMs
          );
          updated[socketId] = {
            ...data,
            path: filteredPath,
          };
        });
        return updated;
      });
    }, 60000);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("location-update", handleLocationUpdate);
      socket.off("anomaly-alert", handleAnomalyAlert);
      socket.off("room-message", handleRoomMessage);
      socket.off("room-users", handleRoomUsers);
      clearInterval(stationaryCheckIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [
    isUserReady,
    user,
    roomCode,
    socket,
    trailExpiryMs,
    mySocketId,
    showToast,
    playAlertSound,
  ]);

  // Chat autoscroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // BATTERY: monitor and send to others
  useEffect(() => {
  let batteryRef = null;
  let lastSentLevel = null;

  const sendBatteryStatus = () => {
    if (!batteryRef || !user?.id || !socket) return;
    const data = {
      level: batteryRef.level,
      charging: batteryRef.charging,
      ts: Date.now(),
    };
    localStorage.setItem("batteryStatus", JSON.stringify(data));
    if (batteryRef.level !== lastSentLevel) {
      socket.emit("battery-status", {
        roomCode,
        userId: user.id,
        level: batteryRef.level,
        charging: batteryRef.charging,
      });
      lastSentLevel = batteryRef.level;
    }
  };

  if (!navigator.getBattery) return;
  navigator.getBattery().then((battery) => {
    batteryRef = battery;
    battery.addEventListener("levelchange", sendBatteryStatus);
    battery.addEventListener("chargingchange", sendBatteryStatus);
    sendBatteryStatus();
  });

  return () => {
    if (batteryRef) {
      batteryRef.removeEventListener("levelchange", sendBatteryStatus);
      batteryRef.removeEventListener("chargingchange", sendBatteryStatus);
    }
  };
}, [socket, user, roomCode]);


  useEffect(() => {
    const socket = getSocket();
    function handleUserBatteryUpdate({ userId, level, charging }) {
      setUserLocations((prev) => ({
        ...prev,
        [userId]: {
          ...(prev[userId] || {}),
          battery: { level, charging },
        },
      }));
    }
    socket.on("user-battery-update", handleUserBatteryUpdate);
    return () => {
      socket.off("user-battery-update", handleUserBatteryUpdate);
    };
  }, []);

  // Calculate group center
  const groupCenter = useMemo(() => {
    const activeUsers = Object.values(userLocations).filter(
      (u) => Date.now() - u.lastSeen < INACTIVE_THRESHOLD
    );
    if (activeUsers.length === 0) return null;
    const sum = activeUsers.reduce(
      (acc, u) => ({
        lat: acc.lat + u.coords.lat,
        lng: acc.lng + u.coords.lng,
      }),
      { lat: 0, lng: 0 }
    );
    return {
      lat: sum.lat / activeUsers.length,
      lng: sum.lng / activeUsers.length,
    };
  }, [userLocations]);

  // Calculate how far a user is from group center
  const calculateDeviation = useCallback(
    (userCoords) => {
      if (!groupCenter || !userCoords) return 0;
      return haversine(groupCenter, userCoords);
    },
    [groupCenter]
  );

  // Only show toast alert when a user leaves (not every render)
  useEffect(() => {
    Object.entries(userLocations).forEach(([id, u]) => {
      if (!u?.coords) return;
      const isNowOutside = isOutsideGeofence(u.coords, geofence);
      if (isNowOutside && !u.wasOutsideGeofence) {
        showToast(`${u.username || "User"} left geofenced area!`, "warning");
        setUserLocations((prev) => ({
          ...prev,
          [id]: { ...prev[id], wasOutsideGeofence: true }
        }));
      } else if (!isNowOutside && u.wasOutsideGeofence) {
        setUserLocations((prev) => ({
          ...prev,
          [id]: { ...prev[id], wasOutsideGeofence: false }
        }));
      }
    });
  }, [userLocations, geofence, showToast]);

  // UI handlers
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    if (!socket.connected) {
      showToast("Cannot send message - disconnected from server", "danger");
      return;
    }
    const message = {
      type: "chat",
      content: newMessage.trim(),
      sender: user?.name || "You",
      timestamp: new Date().toISOString(),
    };
    socket.emit("chat-message", { roomCode, message });
    setMessages((prev) => [...prev, message]);
    setNewMessage("");
    chatInputRef.current?.focus();
  }, [newMessage, socket, roomCode, user, showToast]);
  const handleRecenter = useCallback(() => {
    if (coords && mapRef.current) {
      mapRef.current.setView([coords.lat, coords.lng], 16);
    }
  }, [coords]);
  const handleLeaveRoom = useCallback(() => {
    if (window.confirm("Are you sure you want to leave the room?")) {
      if (socket.connected) {
        socket.emit("leave-room", { roomCode, userId: user.id });
        disconnectSocket();
      }
      window.location.href = "/";
    }
  }, [socket, roomCode, user]);

  const activeUserCount = useMemo(() => {
    const now = Date.now();
    return Object.values(userLocations).filter(
      (u) => now - u.lastSeen < INACTIVE_THRESHOLD
    ).length;
  }, [userLocations]);
  const getUserColor = useCallback(
    (socketId) => {
      const index = activeUsers.findIndex((u) => u.socketId === socketId);
      return COLORS[index % COLORS.length];
    },
    [activeUsers]
  );
  const isUserInAlert = useCallback(
    (socketId) => alertUsers.has(socketId),
    [alertUsers]
  );

  // ---- RETURN: UI ---------
  if (!isUserReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500 text-lg">Loading user data...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500 text-lg">
          Failed to load user data. Please login again.
        </p>
      </div>
    );
  }
  if (locationError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md p-4 bg-red-50 rounded-lg">
          <p className="text-red-500 text-lg">{locationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  if (!coords) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Getting your location...</p>
          <p className="text-sm text-gray-400 mt-2">
            Please allow location access to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative h-screen w-screen overflow-hidden">
        {/* Connection status indicator */}
        <div className="absolute top-4 left-4 z-[9999] flex items-center">
          <div
            className={`w-3 h-3 rounded-full mr-2 ${
              socket.connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-sm">
            {socket.connected ? "Connected" : "Disconnected"}
            {isConnecting && " (Connecting...)"}
          </span>
        </div>
        {/* Toast notification */}
        {toast && (
          <div
            className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 rounded-md shadow-lg ${
              toast.type === "danger"
                ? "bg-red-100 text-red-800 border border-red-200"
                : toast.type === "warning"
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {toast.message}
          </div>
        )}
        <MapContainer
          center={coords}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {/* Draw geofence */}
          {geofence.center && (
            <Circle
              center={geofence.center}
              radius={geofence.radius}
              pathOptions={{ color: "#2563eb", fillColor: "#93c5fd", fillOpacity: 0.2 }}
            />
          )}

          <RecenterMap coords={coords} />

          {/* Render Yourself */}
          <Marker
            position={coords}
            icon={createPulsingIcon(
              userLocations[mySocketId]?.isStationary
                ? "#ef4444"
                : isOutsideGeofence(coords, geofence)
                ? "#f59e0b"
                : getUserColor(mySocketId),
              "You",
              userLocations[mySocketId]?.isStationary
                ? "stationary"
                : isOutsideGeofence(coords, geofence)
                ? "outside"
                : "normal"
            )}
          >
            <Popup className="font-medium">
              {user?.name || "You"}
              {userLocations[mySocketId]?.isStationary && (
                <span className="block text-red-700 font-bold">Stationary - SOS</span>
              )}
              {isOutsideGeofence(coords, geofence) && (
                <span className="block text-orange-700 font-bold">
                  Outside geofenced area!
                </span>
              )}
            </Popup>
          </Marker>
          {/* Render Other Users */}
          {Object.entries(userLocations)
            .filter(([id]) => id !== mySocketId)
            .map(([id, u]) => {
              if (!u?.coords) return null;
              const now = Date.now();
              const isActive = now - u.lastSeen < INACTIVE_THRESHOLD;
              if (!isActive) return null;
              const outside = isOutsideGeofence(u.coords, geofence);
              const deviationDistance = calculateDeviation(u.coords);

              let markerType = null;
              if (u.isStationary) markerType = "stationary";
              else if (deviationDistance > DEVIATION_THRESHOLD) markerType = "far";
              else if (outside) markerType = "outside";
              else markerType = "normal";

              return (
                <React.Fragment key={id}>
                  <Marker
                    position={u.coords}
                    icon={createPulsingIcon(
                      markerType === "stationary"
                        ? "#ef4444"
                        : markerType === "far"
                        ? "#eab308"
                        : markerType === "outside"
                        ? "#f59e0b"
                        : getUserColor(id),
                      u.username,
                      markerType
                    )}
                  >
                    <Popup className="font-medium">
                      <div className="flex flex-col">
                        <span>{u.username}</span>
                        {markerType === "stationary" && (
                          <span className="text-red-600 font-bold">Stationary - SOS</span>
                        )}
                        {markerType === "far" && (
                          <span className="text-yellow-600">
                            {Math.round(deviationDistance)}m from group
                          </span>
                        )}
                        {markerType === "outside" && (
                          <span className="text-orange-600 font-bold">
                            Outside geofenced area!
                          </span>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  {/* Polyline for movement */}
                  {u.path && u.path.length > 1 && (
                    <DecoratedPolyline
                      positions={u.path}
                      color={
                        markerType === "stationary"
                          ? "#ef4444"
                          : markerType === "far"
                          ? "#eab308"
                          : markerType === "outside"
                          ? "#f59e0b"
                          : getUserColor(id)
                      }
                      weight={4}
                      dashArray={
                        markerType === "stationary" || markerType === "far" || markerType === "outside"
                          ? "5,5"
                          : null
                      }
                      isAlert={Boolean(markerType !== "normal")}
                    />
                  )}
                </React.Fragment>
              );
            })}
          {/* Group Center */}
          {groupCenter && (
            <Marker
              position={groupCenter}
              icon={L.divIcon({
                className: "group-center-marker",
                html: `<div class="group-center"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              })}
            >
              <Popup>Group Center</Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Top Right Buttons */}
        <div className="absolute top-4 right-4 space-y-2 z-[9999]">
          <button
            onClick={handleRecenter}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
            title="Recenter map"
          >
            <IoLocationSharp className="text-blue-500 text-xl" />
          </button>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors relative"
            title="Toggle chat"
          >
            <FiMessageSquare className="text-blue-500 text-xl" />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors relative"
            title="Toggle panel"
          >
            <FiUsers className="text-blue-500 text-xl" />
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {activeUserCount}
            </span>
          </button>
          <button
            onClick={handleLeaveRoom}
            className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
            title="Leave room"
          >
            <IoExitOutline className="text-red-500 text-xl" />
          </button>
        </div>
        {/* SOS Button */}
        <button
          onClick={() => {
            playAlertSound();
            emitSOS();
          }}
          className="absolute bottom-20 right-4 z-[9999] p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center"
          title="Send SOS"
        >
          <IoAlertCircle className="text-2xl" />
          <span className="absolute animate-ping inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75" />
        </button>

        {/* Users Panel */}
        {panelOpen && (
          <div className="absolute top-4 left-4 w-64 bg-white/90 backdrop-blur rounded-md shadow-md z-[9999] overflow-hidden">
            <div className="p-3 font-semibold border-b bg-white flex justify-between items-center">
              <span>Active Users ({activeUserCount})</span>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {activeUsers.map((user, idx) => (
                <div
                  key={user.socketId}
                  className={cn(
                    "p-2 border-b flex items-center",
                    userLocations[user.socketId]?.isStationary && "bg-red-50"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        userLocations[user.socketId]?.isStationary
                          ? "#ef4444"
                          : getUserColor(user.socketId),
                    }}
                  />
                  <span className="truncate flex-1">
                    {user.username}
                    {user.socketId === mySocketId && " (You)"}
                    {/* Battery indicator */}
                    {userLocations[user.socketId]?.battery && (
                      <span
                        className="ml-2 text-xs"
                        style={{
                          color:
                            userLocations[user.socketId].battery.level < 0.15
                              ? "red"
                              : userLocations[user.socketId].battery.level < 0.3
                              ? "orange"
                              : "inherit",
                        }}
                      >
                        🔋{" "}
                        {Math.round(
                          userLocations[user.socketId].battery.level * 100
                        )}
                        %
                        {userLocations[user.socketId].battery.charging
                          ? "⚡"
                          : ""}
                        {userLocations[user.socketId].battery.level < 0.15
                          ? " LOW"
                          : ""}
                      </span>
                    )}
                    {/* OUTSIDE AREA indicator */}
                    {isOutsideGeofence(userLocations[user.socketId]?.coords, geofence) && (
                      <span className="ml-2 text-xs text-orange-600">OUTSIDE AREA!</span>
                    )}
                  </span>
                  {userLocations[user.socketId]?.isStationary && (
                    <span className="text-red-600 text-xs font-bold">SOS</span>
                  )}
                </div>
              ))}
            </div>
            <div className="p-2 border-t bg-white">
              <label className="text-xs text-gray-500 block mb-1">
                Trail Duration (minutes):
              </label>
              <select
                value={trailDuration}
                onChange={(e) => setTrailDuration(Number(e.target.value))}
                className="w-full p-1 border rounded text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
              </select>
            </div>
            {/* Geofence radius control */}
            <div className="p-2 border-t bg-white">
              <label className="text-xs text-gray-500 block mb-1">
                Geofence Radius (meters):
              </label>
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={geofence.radius}
                onChange={e => setGeofence(g => ({ ...g, radius: Number(e.target.value) }))}
                className="w-full p-1 border rounded text-sm"
              />
            </div>
          </div>
        )}

        {/* Chat panel */}
        {chatOpen && (
          <div className="absolute bottom-0 right-0 w-full md:w-96 max-h-[50%] bg-white/90 backdrop-blur-md shadow-lg rounded-t-md z-[9999] flex flex-col">
            <div className="p-2 font-semibold border-b bg-white flex justify-between items-center">
              <span>Room Chat</span>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="font-semibold text-gray-700">
                    {msg.sender}
                  </span>
                  <span className="text-gray-600">{msg.content}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="flex border-t bg-white">
              <input
                ref={chatInputRef}
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 bg-blue-500 text-white hover:bg-blue-600"
              >
                <IoMdSend />
              </button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default RoomMap;
