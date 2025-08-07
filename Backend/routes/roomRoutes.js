import {Router} from  "express";
import { protect } from "../middlewares/authmiddelware.js";
import { createRoom, getMyRooms, joinRoom } from "../controllers/roomController.js";

const roomRoutes=Router();

roomRoutes.post("/createRoom",protect,createRoom);
roomRoutes.post("/joinRoom", protect,joinRoom);
roomRoutes.get("/myRooms", protect, getMyRooms); 

export default roomRoutes;