import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    source: {
      type: String,
      required: [true, "Source Location is required"],
    },
    destination: {
      type: String,
      required: [true, "Destination Location is required"],
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
