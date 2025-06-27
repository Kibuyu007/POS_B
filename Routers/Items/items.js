import express from "express";
import { addNewItem, editItem, getAllItems, searchItem, searchItemsInPos } from "../../Controlers/Items/items.js";
import { verifyUser } from "../../Middleware/verifyToken.js";


const router = express.Router();

router.post("/addItem",verifyUser, addNewItem);
router.put("/editItem/:id",verifyUser, editItem);
router.get("/getAllItems", getAllItems);
router.get("/search", searchItem);
router.get("/searchInPos", searchItemsInPos)

export default router;
