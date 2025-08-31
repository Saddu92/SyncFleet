import Room from "../models/Room.js";

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createRoom = async (req, res) => {
  const { source, destination } = req.body;

  if (!source || !destination) {
    return res.status(400).json({ message: "Source and destination are required" });
  }

  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      // Generate a new room code
      const code = generateCode();

      // Try to create and save the room
      const newRoom = new Room({
        code,
        source,
        destination,
        createdBy: req.user._id,
        members: [req.user._id],
      });

      const savedRoom = await newRoom.save();

      return res.status(201).json({
        message: "Room created successfully",
        roomCode: savedRoom.code,
        roomId: savedRoom._id,
      });
    } catch (error) {
      // Handle duplicate key error
      if (error.code === 11000 && error.keyPattern?.code) {
        // Duplicate code, try again
        attempts++;
        continue;
      }

      // If other error, return immediately
      console.error("Room Creation Error:", error);
      return res.status(500).json({ message: "Room creation failed", error: error.message });
    }
  }

  // If failed after all attempts
  return res.status(500).json({ message: "Failed to generate unique room code after multiple attempts" });
};


export const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code)
      return res.status(400).json({ message: "Room code is required" });

    const room = await Room.findOne({ code });

    if (!room) return res.status(404).json({ message: "Room not found" });

    // Check if user already a member
    if (room.members.includes(req.user._id)) {
      return res.status(400).json({ message: "You already joined this room" });
    }

    // Add user to members
    room.members.push(req.user._id);
    await room.save();
  } catch (error) {
    res.status(500).json({ message: "Join room failed", error: error.message });
  }
};

export const getMyRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    const rooms = await Room.find({
      $or: [{ createdBy: userId }, { members: userId }],
    })
      .populate("createdBy", "name email")
      .populate("members", "name email");

    res.status(200).json({ rooms });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch rooms", error: error.message });
  }
};
