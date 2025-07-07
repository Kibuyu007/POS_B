import express from "express";
import { allTransactions, billedTransactions, generateReceipt, payBilledTransaction, storeTransaction } from "../../Controlers/Transactions/sales.js";
import { verifyUser } from "../../Middleware/verifyToken.js";


const router = express.Router();


router.post("/sales",verifyUser, storeTransaction);
router.post("/receipt",generateReceipt)
router.get("/bill", billedTransactions)
router.patch("/payBill/:id",verifyUser, payBilledTransaction)
router.get("/all",allTransactions)

export default router;
