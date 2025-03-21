import express from "express";
import { addNewItemCategories, editItemCategories, getAllItemCategories } from "../../Controlers/Items/itemsCategories.js";


const router = express.Router();

router.post("/addItemCategories", addNewItemCategories);
router.get("/getItemCategories", getAllItemCategories);
router.put("/editItemCategories/:id", editItemCategories);

export default router;
