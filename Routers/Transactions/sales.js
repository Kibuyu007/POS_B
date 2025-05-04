import express from "express";
import { generateReceipt, storeTransaction } from "../../Controlers/Transactions/sales.js";


const router = express.Router();


router.post("/sales", storeTransaction);
router.post("/receipt",generateReceipt);

export default router;
