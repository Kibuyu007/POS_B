import express from "express";
import { verifyUser } from "../../Middleware/verifyToken.js";
import { createTable, getTables, updateTable } from "../../Controlers/Tables/tables.js";

const router = express.Router();

router.post("/addTable",verifyUser, createTable);
router.put("/editTable/:id",verifyUser, updateTable);
router.get("/getTables",verifyUser, getTables);

export default router;
