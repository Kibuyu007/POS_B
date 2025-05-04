import express from 'express';
import { getReceipt, retrieveReceipt, uploadSalesReceipt } from '../../Controlers/Transactions/Receipts/receipt.js';




const router = express.Router();

router.post('/salesReceipt', uploadSalesReceipt);
router.get('/showSalesReceipt/:pdfName', retrieveReceipt);
router.get('/receipt', getReceipt)

export default router;