import express from "express";
import { storeTransaction } from "../../Controlers/Transactions/sales.js";


const router = express.Router();


router.post("/sales", storeTransaction);

export default router;
