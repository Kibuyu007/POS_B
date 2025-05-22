import express from "express";
import { addNewItem, editItem, getAllItems, searchItem } from "../../Controlers/Items/items.js";


const router = express.Router();

router.post("/addItem", addNewItem);
router.put("/editItem/:id",editItem);
router.get("/getAllItems", getAllItems);
router.get("/search", searchItem);

export default router;
