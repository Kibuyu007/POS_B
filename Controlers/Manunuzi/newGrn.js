import newGrn from "../../Models/Manunuzi/newGrn.js";
import Items from "../../Models/Items/items.js";
import supplier from "../../Models/Manunuzi/supplier.js";
import billedNon from "../../Models/Manunuzi/billNonReport.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";




//Add Non PO GRN
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
    return res.status(400).json({
      success: false,
      message: "Items must be a non-empty array",
    });
  }

  try {
    const supplierDetails = await supplier.findOne({
      supplierName: { $regex: new RegExp(`^${supplierName.trim()}$`, "i") },
    });

    if (!supplierDetails) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const stockIdentifier = uuidv4();

    // Prepare items array for newGrn document after updating item quantities
    const itemsToSave = [];

    for (const item of items) {
      const itemDetails = await Items.findOne({ name: item.name });
      if (!itemDetails) {
        return res.status(404).json({
          success: false,
          message: `Item ${item.name} not found`,
        });
      }

      // Update item quantity and other fields
      itemDetails.itemQuantity += item.quantity;
      itemDetails.manufactureDate = item.manufactureDate;
      itemDetails.expireDate = item.expiryDate;
      itemDetails.price = item.sellingPrice;
      await itemDetails.save();

      // Push updated item info to array for embedding
      itemsToSave.push({
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
      });
    }

    // Create ONE newGrn document with all items
    const newStockDetails = new newGrn({
      stockIdentifier,
      items: itemsToSave,
      supplierName: supplierDetails._id,
      invoiceNumber,
      lpoNumber,
      deliveryPerson,
      deliveryNumber,
      description,
      receivingDate,
    });

    const saved = await newStockDetails.save();

    return res.status(200).json({
      success: true,
      message: "New stock added successfully",
      data: saved,
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


//Get All Non PO GRNs
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



//Get all Billed Items in Non PO GRNs
export const billedItemsNonPo = async (req, res) => {
  try {
    const grns = await newGrn.find()
      .populate("supplierName", "supplierName")
      .populate("items.name", "name")
      .lean(); // use .lean() for easier object handling

    const billedItems = [];

    grns.forEach((grn) => {
      const completed = grn.items.filter((item) => item.status === "Completed");
      const billed = grn.items.filter((item) => item.status === "Billed");

      billed.forEach((item) => {
        billedItems.push({
          grnId: grn._id,
          itemId: item._id,
          name: item.name?.name || "Unknown",
          buyingPrice: item.buyingPrice,
          supplier: grn.supplierName?.supplierName || "Unknown",
          createdBy: grn.createdBy || "Unknown",
          createdAt: grn.createdAt,
          completedItems: completed.map((comp) => ({
            name: comp.name?.name || "Unknown",
            quantity: comp.quantity,
          })),
        });
      });
    });

    res.status(200).json({
      success: true,
      data: billedItems,
      message: "Billed items with their completed siblings fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching unpaid GRNs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch billed GRN items",
      error: error.message,
    });
  }
};


//Update Non PO GRN Item Status to Billed
export const updateNonBill = async (req, res) => {
 const { grnId, itemId, userId } = req.body;

  try {
    const grn = await newGrn.findById(grnId);
    if (!grn) return res.status(404).json({ success: false, message: "GRN not found" });

    const item = grn.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });

    if (item.status === "Completed") {
      return res.status(400).json({ success: false, message: "Item already completed" });
    }

    const oldStatus = item.status;
    item.status = "Completed";
    await grn.save();

    // Save report document
    const report = new billedNon({
      grnId,
      itemId,
      itemName: item.name,
      oldStatus,
      newStatus: item.status,
      changedBy: userId,
    });

    await report.save();

    res.status(200).json({
      success: true,
      message: "Item status updated to Completed and report saved",
      report,
    });
  } catch (error) {
    console.error("Error updating status and saving report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update status and save report",
      error: error.message,
    });
  }
};



export const billNonPoReport = async (req, res) => {
  try {
    const reports = await StatusChangeReport.find()
      .populate("grnId", "invoiceNumber supplierName")
      .populate("changedBy", "username email") 
      .sort({ changedAt: -1 });

    res.status(200).json({
      success: true,
      data: reports,
      message: "Status change reports fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
};



