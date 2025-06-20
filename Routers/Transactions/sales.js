import express from "express";
import { allTransactions, billedTransactions, generateReceipt, payBilledTransaction, storeTransaction } from "../../Controlers/Transactions/sales.js";


const router = express.Router();


router.post("/sales", storeTransaction);
router.post("/receipt",generateReceipt);
router.get("/bill",billedTransactions)
router.patch("/payBill/:id",payBilledTransaction)
router.get("/all",allTransactions)

export default router;
