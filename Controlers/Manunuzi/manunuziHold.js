

import items from "../../Models/Items/items.js";
import hold from "../../Models/Manunuzi/manunuziHold.js"

export const addBidhaa = async (req, res) => {
  try {
    const {
      itemId,
      buyingPrice,
      units,
      itemsPerUnit,
      quantity,
      rejected,
      foc,
      batchNumber,
      manufactureDate,
      expiryDate,
      receivedDate,
      comments,
    } = req.body;

    // Validate referenced item exists
    const item = await items.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Create GRN item record
    const grnItem = new hold({
      itemId,
      buyingPrice,
      units,
      itemsPerUnit,
      quantity,
      rejected,
      foc,
      batchNumber,
      manufactureDate,
      expiryDate,
      receivedDate,
      comments,
    });

    await grnItem.save();


    res.status(201).json({ message: "GRN item added successfully", grnItem });
  } catch (error) {
    console.error("Error adding GRN item:", error);
    res.status(500).json({ message: "Server error while adding GRN item" });
  }
};



export const getAllBidhaa = async (req, res) => {
  try {
    const allHold = await hold.find();
    res.status(200).json({ message: "Fetched all items successfully", allHold });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ message: "Server error while fetching items" });
  }
};