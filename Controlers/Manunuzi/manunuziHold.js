

import items from "../../Models/Items/items.js";
import po from "../../Models/Manunuzi/manunuziHold.js"
import { v4 as uuidv4 } from "uuid";

export const addPo = async (req, res) => {
  const { allItems } = req.body;

  if (!Array.isArray(allItems) || allItems.length === 0) {
    return res.status(400).json({ success: false, message: "Items are required" });
  }

  try {
    const itemEntries = await Promise.all(
      allItems.map(async (entry) => {
        const itemDoc = await items.findOne({ name: entry.name });

        if (!itemDoc) {
          throw new Error(`Item '${entry.name}' not found`);
        }

        return {
          item: itemDoc._id,
          requiredQuantity: entry.requiredQuantity,
          description: entry.description || "",
        };
      })
    );

    const newPO = new po({
      grnSessionId: uuidv4(),
      allItems: itemEntries
    });

    const savedPO = await newPO.save();

    return res.status(201).json({
      success: true,
      message: "Purchase Order created successfully",
      data: savedPO
    });

  } catch (error) {
    console.error("Failed to create PO:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create Purchase Order"
    });
  }
};



export const getPo = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const purchaseOrders = await po.find(query)
      .populate("allItems.item", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: purchaseOrders
    });
  } catch (error) {
    console.error("Failed to get POs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchase orders"
    });
  }
};

