import mongoose from "mongoose";
import { genSalt, hash } from "bcryptjs"; // ✅ fixed typo

const UserSchema = new mongoose.Schema({ // ✅ capital S
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
});

// 🔐 Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // only hash if changed
  const salt = await genSalt(10); // 10 is the default salt rounds
  this.password = await hash(this.password, salt);
  next();
});

const User = mongoose.model("User", UserSchema); // ✅ singular model name
export default User;
