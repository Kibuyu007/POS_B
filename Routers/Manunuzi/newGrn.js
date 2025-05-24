import express from "express";
import { addNewGrn } from "../../Controlers/Manunuzi/newGrn.js";



const router = express.Router();

router.post("/newGrn",addNewGrn);


export default router;