import mongoose from "mongoose";
import Request from "../../Models/Orders/orderRequest.js";
import Item from "../../Models/Items/items.js";
import Order from "../../Models/Orders/orders.js";

// Generate unique request number
const generateRequestNumber = async () => {
  const prefix = "REQ";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const count = await Request.countDocuments({
    requestNumber: { $regex: `^${prefix}-${date}` },
  });
  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}-${date}-${sequence}`;
};

// CUSTOMER CREATE REQUEST
export const createRequest = async (req, res) => {
  try {
    const { customerName, customerPhone, items, notes, source } = req.body;

    // Validations
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    if (!customerPhone || !customerPhone.trim()) {
      return res.status(400).json({ message: "Customer phone is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    for (const item of items) {
      if (!item.itemId) {
        return res.status(400).json({ message: "Item ID is required for each item" });
      }

      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be greater than 0" });
      }

      const existingItem = await Item.findById(item.itemId);
      if (!existingItem) {
        return res.status(404).json({ message: `Item with ID ${item.itemId} not found` });
      }
    }

    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const itemData = await Item.findById(item.itemId);
        return {
          item: itemData._id,
          itemName: itemData.name,
          quantity: item.quantity,
        };
      })
    );

    const requestNumber = await generateRequestNumber();

    const request = await Request.create({
      requestNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: populatedItems,
      notes: notes || "",
      source: source || "Website", // or "Public Link"
      status: "Pending",
      
    });

    res.status(201).json({
      success: true,
      message: "Request submitted successfully",
      data: {
        requestNumber: request.requestNumber,
        customerName: request.customerName,
        items: request.items,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//GET ALL REQUESTS
export const getRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    let query = {};
    if (search) {
      query = {
        $or: [
          { customerName: { $regex: search, $options: "i" } },
          { customerPhone: { $regex: search, $options: "i" } },
          { requestNumber: { $regex: search, $options: "i" } },
        ],
      };
    }

    const requests = await Request.find(query)
      .populate("items.item", "name price itemQuantity")
      .populate("order", "orderNumber totalAmount")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//GET PENDING REQUESTS
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await Request.find({ status: "Pending" })
      .populate("items.item", "name price itemQuantity")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//GET CONVERTED REQUESTS
export const getConvertedRequests = async (req, res) => {
  try {
    const requests = await Request.find({ status: "Converted" })
      .populate("items.item", "name price sku")
      .populate("order", "orderNumber totalAmount status")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error("Error fetching converted requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// GET SINGLE REQUEST
export const getSingleRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await Request.findById(id)
      .populate("items.item", "name price sku category")
      .populate("order", "orderNumber totalAmount status")
      .populate("reviewedBy", "name email");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error("Error fetching request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// SEARCH REQUESTS
export const searchRequests = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const query = {
      $or: [
        { customerName: { $regex: q, $options: "i" } },
        { customerPhone: { $regex: q, $options: "i" } },
        { requestNumber: { $regex: q, $options: "i" } },
      ],
    };

    const requests = await Request.find(query)
      .populate("items.item", "name price")
      .populate("order", "orderNumber totalAmount")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    console.error("Error searching requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// CONVERT REQUEST TO ORDER
export const convertRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await Request.findById(id).populate("items.item");

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        message: `Cannot convert request with status: ${request.status}`,
      });
    }

    // Build order items with pricing
    let totalAmount = 0;
    let totalDiscount = 0;
    const orderItems = [];

    for (const reqItem of request.items) {
      const product = reqItem.item;

      if (product.itemQuantity < reqItem.quantity) {
        return res.status(400).json({
          message: `Only ${product.itemQuantity} units of "${product.name}" available`,
        });
      }

      let unitPrice = product.price;
      let isWholesale = false;

      if (
        product.enableWholesale &&
        reqItem.quantity >= product.wholesaleMinQty &&
        product.wholesalePrice > 0
      ) {
        unitPrice = product.wholesalePrice;
        isWholesale = true;
      }

      const discount = 0;
      const totalPrice = unitPrice * reqItem.quantity;

      totalAmount += unitPrice * reqItem.quantity;
      totalDiscount += discount;

      orderItems.push({
        item: product._id,
        itemName: product.name,
        quantity: reqItem.quantity,
        unitPrice,
        discount,
        totalPrice,
        isWholesale,
      });

      await product.save();
    }

    const grandTotal = totalAmount - totalDiscount;

    const order = await Order.create({
      orderNumber: `ORD-${Date.now()}`,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      items: orderItems,
      totalAmount,
      totalDiscount,
      grandTotal,
      balance: grandTotal,
      paymentStatus: "Unpaid",
      notes: request.notes,
      createdBy: userId,
      lastModifiedBy: userId,
    });

    request.status = "Converted";
    request.order = order._id;
    request.reviewedBy = userId;
    await request.save();

    res.status(200).json({
      success: true,
      message: "Request converted to order successfully",
      data: { request, order },
    });
  } catch (error) {
    console.error("Error converting request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//GET GENERATED REQUEST NUMBER
export const getGeneratedrequestNumber = async (req, res) => {
  try {
    // Ensure the field name in the database matches your schema
    // Based on your database document, the field is "requestNumber"
    const request = await Request.findOne({
      requestNumber: req.params.requestNumber,
    })
      .populate("items.item", "name price")
      .select("-customerPhone");

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        requestNumber: request.requestNumber,
        customerName: request.customerName,
        items: request.items,
        status: request.status,
        notes: request.notes,
        createdAt: request.createdAt,
        order: request.order ? { orderNumber: request.order.orderNumber } : null,
      },
    });
  } catch (error) {
    console.error("Error in getGeneratedrequestNumber:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


//REJECT REQUEST
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "Pending") {
      return res.status(400).json({
        message: `Cannot reject request with status: ${request.status}`,
      });
    }

    request.status = "Rejected";
    request.rejectionReason = reason || "No reason provided";
    request.reviewedBy = userId;
    await request.save();

    res.status(200).json({
      success: true,
      message: "Request rejected successfully",
      data: request,
    });
  } catch (error) {
    console.error("Error rejecting request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await Request.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status === "Converted") {
      return res.status(400).json({
        message: "Cannot delete converted requests. Delete the associated order first.",
      });
    }

    await request.deleteOne();

    res.status(200).json({ success: true, message: "Request deleted successfully" });
  } catch (error) {
    console.error("Error deleting request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};