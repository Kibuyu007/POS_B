import express from "express";
import { verifyUser } from "../../Middleware/verifyToken.js";
import { deleteUser, getAllUsers, getUser, updateUser, userStatus } from "../../Controlers/Users/users.js";

const router = express.Router()

router.put('/update/:id',updateUser)
router.delete('/delete/:id', verifyUser, deleteUser)
router.get('/allUsers',getAllUsers)
router.get('/user/:id',getUser)
router.put('/status/:id',userStatus)


export default router