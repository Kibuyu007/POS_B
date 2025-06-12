import express from "express";
import { addNewGrn } from "../../Controlers/Manunuzi/newGrn.js";
import { addPoGrn } from "../../Controlers/Manunuzi/poGrn.js";



const router = express.Router();

router.post("/newGrn",addNewGrn);
router.post("/poGrn",addPoGrn)


export default router;