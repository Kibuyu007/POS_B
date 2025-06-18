import newGrn from "../../Models/Manunuzi/newGrn.js";
import Items from "../../Models/Items/items.js";
import supplier from "../../Models/Manunuzi/supplier.js";
import billedNon from "../../Models/Manunuzi/billNonReport.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export const addNewGrn = async (req, res) => {
  const {
    items,
    supplierName,
    invoiceNumber,
    lpoNumber,
    deliveryPerson,
    deliveryNumber,
    description,
    receivingDate,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Items must be a non-empty array" });
  }

  try {
    const supplierDetails = await supplier.findOne({
      supplierName: { $regex: new RegExp(`^${supplierName.trim()}$`, "i") },
    });

    if (!supplierDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    const stockIdentifier = uuidv4();

    const newStockItems = await Promise.all(
      items.map(async (item) => {
        const itemDetails = await Items.findOne({ name: item.name });
        console.log("Received items:", items);
        if (!itemDetails) {
          throw new Error(`Item ${item.name} not found`);
        }

        itemDetails.itemQuantity += item.quantity;
        itemDetails.manufactureDate = item.manufactureDate;
        itemDetails.expireDate = item.expiryDate;
        itemDetails.price = item.sellingPrice;

        await itemDetails.save();

        const newStockDetails = new newGrn({
          stockIdentifier,
          items: [
            {
              name: itemDetails._id,
              quantity: item.quantity,
              buyingPrice: item.buyingPrice,
              sellingPrice: item.sellingPrice,
              batchNumber: item.batchNumber,
              manufactureDate: item.manufactureDate,
              expiryDate: item.expiryDate,
              receivedDate: item.receivedDate || new Date().toISOString(),
              foc: item.foc,
              rejected: item.rejected,
              comments: item.comments,
              totalCost: item.totalCost,
              status: item.status || "Completed",
            },
          ],
          supplierName: supplierDetails._id,
          invoiceNumber,
          lpoNumber,
          deliveryPerson,
          deliveryNumber,
          description,
          receivingDate,
        });

        const saved = await newStockDetails.save();
        return saved.toObject();
      })
    );

    return res.status(200).json({
      success: true,
      message: "New stock added successfully",
      data: newStockItems,
    });
  } catch (error) {
    console.error("Error adding new stock:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add new stock",
      error: error.message,
    });
  }
};

export const completedNonPo = async (req, res) => {
  try {
    const allGrns = await newGrn.find()
      .populate("supplierName", "supplierName")
      .populate("items.name", "name");

    res.status(200).json({
      success: true,
      data: allGrns,
      message: "All new GRNs fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching new GRNs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch new GRNs",
      error: error.message,
    });
  }
};


export const billedItemsNonPo = async (req, res) => {
  try {
    const billedGrns = await newGrn.find({ "items.status": "Billed" })
      .populate("items.name", "name") 
      .populate("supplierName", "supplierName");

    const billedItems = [];

    billedGrns.forEach((grn) => {
      grn.items.forEach((item) => {
        if (item.status === "Billed") {
          billedItems.push({
            id: item._id,
            name: item.name.name, 
            buyingPrice: item.buyingPrice,
            sellingPrice: item.sellingPrice,
            quantity: item.quantity,
            supplier: grn.supplierName.supplierName,
            invoiceNumber: grn.invoiceNumber,
            receivingDate: grn.receivingDate,
          });
        }
      });
    });

    return res.status(200).json({
      success: true,
      data: billedItems,
      message: "Billed items fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching billed items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch billed items",
      error: error.message,
    });
  }
};


export const nonPoBillDetails = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid GRN ID" });
  }

  try {
    const grn = await newGrn.findById(id)
      .populate("items.name", "name")
      .populate("supplierName", "supplierName")
      .populate("createdBy", "username") // optional if you save this
      .lean();

    if (!grn) {
      return res.status(404).json({ success: false, message: "GRN not found" });
    }

    const formattedItems = Array.isArray(grn.items)
      ? grn.items.map((item) => ({
          itemId: item.name?._id,
          name: item.name?.name || "Unknown",
          quantity: item.quantity,
          buyingPrice: item.buyingPrice,
          sellingPrice: item.sellingPrice,
          status: item.status,
        }))
      : [];

    const result = {
      grnId: grn._id,
      supplier: grn.supplierName?.supplierName || "Unknown",
      invoiceNumber: grn.invoiceNumber,
      receivingDate: grn.receivingDate,
      createdBy: grn.createdBy?.username || "N/A",
      createdAt: grn.createdAt,
      items: formattedItems,
    };

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error fetching GRN details:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




export const updateNonBill = async (req, res) => {
   try {
    // Accept either itemId (single) or itemIds (array)
    const rawIds = req.body.itemIds || (req.body.itemId ? [req.body.itemId] : []);

    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No item ID(s) provided",
      });
    }

    // Optional: Validate all provided IDs
    const itemIds = rawIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid item IDs provided",
      });
    }

    // Find all GRNs containing these item IDs
    const grns = await newGrn.find({ "items._id": { $in: itemIds } });

    const updatedGrns = [];

    for (const grn of grns) {
      let isModified = false;

      grn.items.forEach(item => {
        if (itemIds.includes(item._id.toString()) && item.status === "Billed") {
          item.status = "Completed";
          isModified = true;
        }
      });

      if (isModified) {
        await grn.save();
        updatedGrns.push(grn._id);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Selected item(s) updated to 'Completed'",
      updatedGrns,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update item status(es)",
      error: error.message,
    });
  }
};



export const billNonPoReport = async (req, res) => {
  try {
    const records = await billedNon
      .find({ action: "Status updated to Completed" })
      .populate("itemId", "name")
      .populate("grnId", "invoiceNumber receivingDate")
      .sort({ updatedAt: -1 });

    const reportData = records.map((r) => ({
      itemName: r.itemId.name,
      grnId: r.grnId._id,
      invoiceNumber: r.grnId.invoiceNumber,
      receivingDate: r.grnId.receivingDate,
      updatedAt: r.updatedAt,
    }));

    res.status(200).json({ success: true, data: reportData });
  } catch (error) {
    console.error("Report generation failed:", error);
    res.status(500).json({ success: false, message: "Failed to get report" });
  }
};



