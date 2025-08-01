import express from "express";
import { addNewGrn, billedItemsNonPo, billNonPoReport, completedNonPo, updateNonBill } from "../../Controlers/Manunuzi/newGrn.js";
import { addPoGrn, allGrnsPo, biilledItems, billedReport, billOtherDetails, getGrnPo, outstandingGrn, updateBill, updateOutstand } from "../../Controlers/Manunuzi/poGrn.js";
import { verifyUser } from "../../Middleware/verifyToken.js";



const router = express.Router();



router.post("/poGrn",addPoGrn);
router.get("/unpaidPo", biilledItems);
router.get("/outstand",verifyUser, outstandingGrn);
router.get("/grnPo/:id", getGrnPo);
router.get("/allGrnPo", allGrnsPo);
router.get("/billDetails/:id", billOtherDetails);
router.put("/updateOutstanding",updateOutstand);
router.get("/billPo",billedReport)
router.put("/updateBill", updateBill)

router.post("/newGrn",addNewGrn);
router.get("/unpaidNonPo", billedItemsNonPo);
router.get("/nonPo",completedNonPo);
router.put("/updateNonPoBill", updateNonBill);
router.get("/nonPoBillReport",billNonPoReport);



export default router;