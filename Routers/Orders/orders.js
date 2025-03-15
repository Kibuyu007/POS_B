import express from "express";
import {
  createOrder,
  updateOrder,
  getOrderById,
  getOrders,
} from "../../Controlers/Orders/order.js";
import { verifyUser } from "../../Middleware/verifyToken.js";

const router = express.Router();

router.post("/addOrder",verifyUser, createOrder);
router.put("/editOrder/:id",verifyUser, updateOrder);
router.get("/getOrder/:id",verifyUser, getOrderById);
router.get("/getAllOrders",verifyUser, getOrders);

export default router;
