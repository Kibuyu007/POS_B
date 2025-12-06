import newGrn from "../../Models/Manunuzi/newGrn.js";
import Items from "../../Models/Items/items.js";
import supplier from "../../Models/Manunuzi/supplier.js";
import billedNon from "../../Models/Manunuzi/billNonReport.js";
import { v4 as uuidv4 } from "uuid";


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
      itemDetails.itemQuantity =
        Number(itemDetails.itemQuantity) +
        Number(item.quantity) +
        Number(item.billedAmount);

      itemDetails.manufactureDate = item.manufactureDate;
      itemDetails.expireDate = item.expiryDate;
      itemDetails.price = item.sellingPrice;
      await itemDetails.save();

      // Determine status based on billedAmount
      const status =
        item.billedAmount && item.billedAmount > 0 ? "Billed" : "Completed";

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
        billedAmount: item.billedAmount,
        comments: item.comments,
        totalCost: item.totalCost,
        status,
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
      createdBy: req.userId,
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
    const allGrns = await newGrn
      .find()
      .populate("supplierName", "supplierName")
      .populate("createdBy", "userName")
      .populate("items.name", "name")
      .sort({ createdAt: -1 });

    // Get today's date string (e.g., "2025-07-07")
    const today = new Date().toISOString().split("T")[0];

    let totalItemCost = 0;
    let todayTotalCost = 0;

    allGrns.forEach((order) => {
      const orderDate = new Date(order.receivingDate || order.createdAt)
        .toISOString()
        .split("T")[0];

      const orderTotal = order.items.reduce((sum, item) => {
        const itemCost = item.totalCost || 0;
        return sum + itemCost;
      }, 0);

      totalItemCost += orderTotal;

      if (orderDate === today) {
        todayTotalCost += orderTotal;
      }
    });

    res.status(200).json({
      success: true,
      data: allGrns,
      cost: totalItemCost,
      todayTotalCost,
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

// Get all Billed Items in Non PO GRNs
export const billedItemsNonPo = async (req, res) => {
  try {
    const grns = await newGrn
      .find()
      .populate("supplierName", "supplierName")
      .populate("createdBy", "firstName lastName")
      .populate("items.name", "name")
      .sort({ createdAt: -1 })
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
          billedAmount: item.billedAmount || 0,
          billedTotalCost: (item.buyingPrice || 0) * (item.billedAmount || 0),
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
      message:
        "Billed items with their completed siblings fetched successfully",
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
  const { grnId, itemId, billedAmount, userId } = req.body;

  try {
    const grn = await newGrn
      .findById(grnId)
      .populate("supplierName", "supplierName"); // Ensure supplier is populated

    if (!grn) {
      return res.status(404).json({ success: false, message: "GRN not found" });
    }

    const item = grn.items.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in GRN" });
    }

    if (item.status === "Completed") {
      return res
        .status(400)
        .json({ success: false, message: "Item already marked as Completed" });
    }

    const oldStatus = item.status;
    item.status = "Completed";
    await grn.save();

    // Resolve item name from embedded or reference
    let itemName = "Unknown";
    if (typeof item.name === "object" && item.name.name) {
      itemName = item.name.name;
    } else {
      const itemDoc = await Items.findById(item.name);
      if (itemDoc) itemName = itemDoc.name;
    }

    const supplier = grn.supplierName?.supplierName || "Unknown";
    const buyingPrice = item.buyingPrice || 0;
    const billedTotalCost = buyingPrice * (item.billedAmount || 0);

    const report = new billedNon({
      grnId: grn._id,
      itemId: item._id,
      itemName,
      supplier,
      buyingPrice: item.buyingPrice || 0,
      billedAmount: item.billedAmount || 0,
      billedTotalCost,
      oldStatus,
      newStatus: item.status,
      createdBy: req.userId,
    });

    await report.save();

    res.status(200).json({
      success: true,
      message: "Item status updated and report saved with supplier info",
      report,
    });
  } catch (error) {
    console.error("Error updating billed item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update item and save report",
      error: error.message,
    });
  }
};

//Bill Non PO Report
export const billNonPoReport = async (req, res) => {
  try {
    const reports = await billedNon
      .find()
      .populate("grnId", "grnNumber")
      .populate("itemId", "name")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });
    console.log("Populated Reports:", reports);
    console.log(
      "Populated Reports with changedBy:",
      JSON.stringify(reports, null, 2)
    );

    res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (err) {
    console.error("Error fetching non-billed report:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch non-billed report",
    });
  }
};
