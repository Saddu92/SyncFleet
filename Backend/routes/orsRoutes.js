import { Router } from "express";
import { getGeoCode, getDirections } from "../controllers/orsController.js";

const orsRoutes = Router();

// ✅ External API routes
orsRoutes.get("/geocode", getGeoCode);
orsRoutes.get("/directions", getDirections);

export default orsRoutes;
