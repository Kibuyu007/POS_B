import mongoose from "mongoose";
import orders from "../../Models/Orders/orders.js";



//Create Order
export const createOrder = async (req, res) => {
  try {
    const { customerDetails, orderStatus, bills, items } = req.body;

    const newOrder = new orders({
      customerDetails,
      orderStatus,
      bills,
      items,
    });

    const savedOrder = await newOrder.save();
    res.status(201).json({ message: "Order created successfully", data: savedOrder });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



//Update Order
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the provided ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Order ID" });
    }

    const updatedOrder = await orders.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ message: "Order updated successfully", data: updatedOrder });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};




//Get Order by ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Order ID" });
    }

    const order = await orders.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ data: order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};





//Get All Orders
export const getOrders = async (req, res) => {
  try {
    const allOrders = await orders.find().sort({ createdAt: -1 });
    res.status(200).json({ data: allOrders });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
