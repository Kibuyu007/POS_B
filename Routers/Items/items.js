import express from "express";
import { addNewItem, editItem, getAllItems, getAllItemsRaw, getCountsByCategory, getItemsPublic, searchItem, searchItemsInPos } from "../../Controlers/Items/items.js";
import { verifyUser } from "../../Middleware/verifyToken.js";
import { getStockLedger} from "../../Controlers/Items/ledger.js";


const router = express.Router();

router.post("/addItem",verifyUser, addNewItem);
router.put("/editItem/:id",verifyUser, editItem);
router.get("/getAllItems", getAllItems);
router.get("/search", searchItem);
router.get("/searchInPos", searchItemsInPos)
router.get("/allItemsRaw", getAllItemsRaw);
router.get("/itemsWithCategories", getCountsByCategory);


// Ledger routes

// Route for the main table
router.get("/stock-ledger/:itemId", getStockLedger);

//GET ALL ITEMS FOR PUBLIC
router.get("/public/items", getItemsPublic);

export default router;
