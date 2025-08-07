import {Router} from  "express";
import { loginUser, registrerUser } from "../controllers/authController.js";

const authRoutes=Router();

authRoutes.post("/register", registrerUser);
authRoutes.post("/login",loginUser);

export default authRoutes;