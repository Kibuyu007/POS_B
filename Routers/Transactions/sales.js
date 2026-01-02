import express from "express";
import { allTransactions, billedTransactions, getBilledWallet, mostSoldItems, payBilledTransaction, storeTransaction } from "../../Controlers/Transactions/sales.js";
import { verifyUser } from "../../Middleware/verifyToken.js";


const router = express.Router();


router.post("/sales",verifyUser, storeTransaction);
router.get("/bill", billedTransactions);
router.patch("/payBill/:id",verifyUser, payBilledTransaction);
router.get("/all",allTransactions);
router.get("/mostSold", mostSoldItems);
router.get("/walletBill", getBilledWallet)

export default router;
