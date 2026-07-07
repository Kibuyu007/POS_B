import Orders from "../../Models/Orders/orders.js";
import Items from "../../Models/Items/items.js";



//CREATE ORDER
export const createOrder = async (req, res) => {
  try {
    const { customerName, customerPhone, items, notes } = req.body;

    if (!customerName?.trim()) {
      return res.status(400).json({ success: false, message: "Customer name is required" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items selected" });
    }

    let totalAmount = 0;
    let totalDiscount = 0;
    const orderItems = [];

    for (const orderItem of items) {
      const product = await Items.findById(orderItem.itemId);
      if (!product) {
        return res.status(404).json({ success: false, message: "Item not found" });
      }

      if (product.itemQuantity < orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.itemQuantity} ${product.name} remaining`,
        });
      }

      let unitPrice = product.price;
      let isWholesale = false;

      if (
        product.enableWholesale &&
        orderItem.quantity >= product.wholesaleMinQty &&
        product.wholesalePrice > 0
      ) {
        unitPrice = product.wholesalePrice;
        isWholesale = true;
      }

      const discount = Math.max(0, Number(orderItem.discount || 0));
      const totalPrice = Math.max(0, unitPrice * orderItem.quantity - discount);

      totalAmount += unitPrice * orderItem.quantity;
      totalDiscount += discount;

      orderItems.push({
        item: product._id,
        itemName: product.name,
        quantity: orderItem.quantity,
        unitPrice,
        discount,
        totalPrice,
        isWholesale,
      });

      await product.save();
    }

    const grandTotal = Math.max(0, totalAmount - totalDiscount);

    const order = await Orders.create({
      orderNumber: `ORD-${Date.now()}`,
      customerName,
      customerPhone,
      items: orderItems,
      totalAmount,
      totalDiscount,
      grandTotal,
      balance: grandTotal,
      paymentStatus: "Unpaid",
      notes: notes || "",
      createdBy: req.userId,
      lastModifiedBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to create order" });
  }
};


//UPDATE ORDER STATUS
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["Pending", "Confirmed", "Cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Pending, Confirmed or Cancelled",
      });
    }

    const order = await Orders.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed orders cannot be modified",
      });
    }

    order.status = status;
    order.lastModifiedBy = req.userId;
    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order marked as ${status}`,
      data: order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to update order status" });
  }
};


//GETTING ALL ORDERS
export const getOrders = async (req, res) => {
  try {
    const orders = await Orders.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName")
      .populate("sale", "totalAmount paidAmount balance");

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch orders" });
  }
};

//GETTING ONLT ONE ORDER
export const getSingleOrder = async (req, res) => {
  try {
    const order = await Orders.findById(req.params.id)
      .populate("items.item")
      .populate("createdBy", "firstName lastName")
      .populate("sale");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};


//DELETE ORDER
export const deleteOrder = async (req, res) => {
  try {
    const order = await Orders.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed orders cannot be deleted",
      });
    }

    await Orders.findByIdAndDelete(req.params.id);

    return res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to delete order" });
  }
};


//GETTTING PENDING ORDERS
export const getPendingOrders = async (req, res) => {
  try {
    const orders = await Orders.find({ status: "Pending" })
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName");

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch pending orders" });
  }
};


//SEARCHING ORDERS
export const searchOrders = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search keyword required",
      });
    }

    const orders = await Orders.find({
      $or: [
        { customerName: { $regex: q, $options: "i" } },
        { customerPhone: { $regex: q, $options: "i" } },
        { orderNumber: { $regex: q, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Search failed" });
  }
};