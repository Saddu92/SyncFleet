import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    source: {
      displayName: { type: String, required: true }, // ✅ Store Nominatim display_name
      lat: { type: Number, required: true },         // ✅ Store latitude
      lon: { type: Number, required: true },         // ✅ Store longitude
    },
    destination: {
      displayName: { type: String, required: true },
      lat: { type: Number, required: true },
      lon: { type: Number, required: true },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Room = mongoose.model("Room", RoomSchema);
export default Room;
