import express from "express";
import { addNewGrn, billedItemsNonPo, completedNonPo } from "../../Controlers/Manunuzi/newGrn.js";
import { addPoGrn, biilledItems, getGrnPo, outstandingGrn } from "../../Controlers/Manunuzi/poGrn.js";



const router = express.Router();

router.post("/newGrn",addNewGrn);
router.post("/poGrn",addPoGrn);
router.get("/unpaidPo", biilledItems);
router.get("/outstand", outstandingGrn);
router.get("/unpaidNonPo", billedItemsNonPo);
router.get("/nonPo",completedNonPo);
router.get("/grnPo/:id", getGrnPo);


export default router;