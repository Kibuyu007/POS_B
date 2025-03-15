import express from "express";
import { verifyUser } from "../../Middleware/verifyToken.js";
import { deleteUser, updateUser } from "../../Controlers/Users/users.js";

const router = express.Router()

router.patch('/update/:id',verifyUser,updateUser)
router.delete('/delete/:id', verifyUser, deleteUser)
router.get('/get',verifyUser)

export default router