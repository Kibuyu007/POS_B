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
    // 1 Find supplier
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

    // 2 Process each GRN item
    for (const item of items) {

      // MUST be ObjectId
      const itemDetails = await Items.findOne({name: item.name});
      if (!itemDetails) {
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
      }

      // -------------------------------
      // SAFE NUMERIC VALUES
      // -------------------------------
      const receivedQty = Number(item.quantity) || 0;
      const buyingPrice = Number(item.buyingPrice) || 0;
      const sellingPrice = Number(item.sellingPrice) || 0;
      const billedAmount = Number(item.billedAmount) || 0;

      const wholesaleMinQty = Number(item.wholesaleMinQty) || 0;
      const wholesalePrice = Number(item.wholesalePrice) || 0;

      const enableWholesale =
        wholesaleMinQty > 0 && wholesalePrice > 0;

      // -------------------------------
      // UPDATE ITEM MASTER
      // -------------------------------
      itemDetails.itemQuantity += receivedQty + billedAmount;

      itemDetails.manufactureDate = item.manufactureDate;
      itemDetails.expireDate = item.expiryDate;

      //  Update retail price ONLY if provided
      if (sellingPrice > 0) {
        itemDetails.price = sellingPrice;
      }

      // Update wholesale ONLY if provided
      if (enableWholesale) {
        itemDetails.enableWholesale = true;
        itemDetails.wholesaleMinQty = wholesaleMinQty;
        itemDetails.wholesalePrice = wholesalePrice;
      }

      await itemDetails.save();

      // -------------------------------
      // BILLING
      // -------------------------------
      const billedTotalCost = billedAmount * buyingPrice;
      const remainingBalance = billedTotalCost;

      const status = billedAmount > 0 ? "Billed" : "Completed";

      // -------------------------------
      // BUILD GRN ITEM SNAPSHOT
      // -------------------------------
      itemsToSave.push({
        name: itemDetails._id,
        quantity: receivedQty,
        buyingPrice,

        // Retail snapshot
        sellingPrice,

        // Wholesale snapshot
        enableWholesale,
        wholesaleMinQty,
        wholesalePrice,

        batchNumber: item.batchNumber,
        manufactureDate: item.manufactureDate,
        expiryDate: item.expiryDate,
        receivedDate: item.receivedDate || new Date(),

        foc: item.foc,
        rejected: item.rejected,

        billedAmount,
        billedTotalCost,
        paidAmount: 0,
        remainingBalance,
        isFullyPaid: false,

        comments: item.comments,
        totalCost: item.totalCost,
        status,
        changedAt: new Date(),
      });
    }

    // 3 Save GRN
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
    console.error("Error adding new stock:", error);
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
    // Fetch GRNs that contain at least one item that is billed or partially paid
    const grns = await newGrn
      .find({ "items.status": "Billed" })
      .populate("supplierName", "supplierName")
      .populate("createdBy", "firstName lastName")
      .populate("items.name", "name")
      .sort({ createdAt: -1 })
      .lean();

    const billedItems = [];

    grns.forEach((grn) => {
      // Sibling completed items (for reference)
      const completedItems = grn.items.filter(
        (item) => item.status === "Completed"
      );

      // Only include billed items with remainingBalance > 0
      const pendingBilled = grn.items.filter(
        (item) => item.status === "Billed" && item.remainingBalance > 0
      );

      pendingBilled.forEach((item) => {
        billedItems.push({
          grnId: grn._id,
          itemId: item._id,
          name: item.name?.name || "Unknown",
          buyingPrice: item.buyingPrice,
          billedAmount: item.billedAmount || 0,
          billedTotalCost: item.billedTotalCost || 0,
          paidAmount: item.paidAmount || 0,
          remainingBalance: item.remainingBalance || 0,
          isFullyPaid: item.isFullyPaid || false,
          supplier: grn.supplierName?.supplierName || "Unknown",
          createdBy: grn.createdBy
            ? `${grn.createdBy.firstName} ${grn.createdBy.lastName}`
            : "Unknown",
          createdAt: grn.createdAt,
          completedItems: completedItems.map((comp) => ({
            name: comp.name?.name || "Unknown",
            quantity: comp.quantity,
          })),
        });
      });
    });

    return res.status(200).json({
      success: true,
      data: billedItems,
      message: "Pending billed items fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching billed GRNs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch billed GRN items",
      error: error.message,
    });
  }
};

// Make payment for billed GRN itemm
export const makePartialPayment = async (req, res) => {
  const { grnId, itemId, paymentAmount } = req.body;

  if (!grnId || !itemId || !paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "grnId, itemId, and positive paymentAmount are required",
    });
  }

  try {
    // Find the GRN containing the item
    const grn = await newGrn.findOne({ _id: grnId, "items._id": itemId });

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN or item not found",
      });
    }

    // Find the specific item
    const item = grn.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found in this GRN",
      });
    }

    if (item.isFullyPaid) {
      return res.status(400).json({
        success: false,
        message: "Item is already fully paid",
      });
    }

    // Calculate new balances
    const newPaidAmount = Number(item.paidAmount || 0) + Number(paymentAmount);
    const remainingBalance = Math.max(
      (item.billedTotalCost || 0) - newPaidAmount,
      0
    );
    const isFullyPaid = remainingBalance === 0;

    // Update item fields
    item.paidAmount = newPaidAmount;
    item.remainingBalance = remainingBalance;
    item.isFullyPaid = isFullyPaid;

    // Change status to Completed if fully paid
    if (isFullyPaid) {
      item.status = "Completed";
    }

    item.changedAt = new Date();

    // Save the GRN
    await grn.save();

    return res.status(200).json({
      success: true,
      message: "Payment applied successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply payment",
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
      .populate("supplierName", "supplierName");

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

    // Calculate total cost
    const billedTotalCost = (item.buyingPrice || 0) * (item.billedAmount || 0);

    // Resolve item name
    let itemName = "Unknown";
    if (typeof item.name === "object" && item.name.name) {
      itemName = item.name.name;
    } else {
      const itemDoc = await Items.findById(item.name);
      if (itemDoc) itemName = itemDoc.name;
    }

    const supplier = grn.supplierName?.supplierName || "Unknown";

    // Create billedNon report WITH PAYMENT FIELDS
    const report = new billedNon({
      grnId: grn._id,
      itemId: item._id,
      itemName,
      supplier,
      buyingPrice: item.buyingPrice || 0,
      billedAmount: item.billedAmount || 0,
      billedTotalCost,
      paidAmount: 0, // Initial payment is 0
      remainingBalance: billedTotalCost, // Full amount remains
      isFullyPaid: false,
      oldStatus,
      newStatus: item.status,
      createdBy: req.userId,
    });

    await report.save();

    res.status(200).json({
      success: true,
      message: "Item status updated and report saved with payment tracking",
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
    // Fetch all GRNs that contain at least one fully paid billed item
    const grns = await newGrn
      .find({ "items.isFullyPaid": true, "items.billedAmount": { $gt: 0 } })
      .populate("supplierName", "supplierName")
      .populate("createdBy", "firstName lastName")
      .populate("items.name", "name")
      .sort({ createdAt: -1 })
      .lean();

    const reportData = [];

    grns.forEach((grn) => {
      const fullyPaidBilledItems = grn.items.filter(
        (item) => item.isFullyPaid && item.billedAmount > 0
      );

      fullyPaidBilledItems.forEach((item) => {
        reportData.push({
          grnId: grn._id,
          grnNumber: grn.stockIdentifier,
          itemId: item._id,
          itemName: item.name?.name || "Unknown",
          supplier: grn.supplierName?.supplierName || "Unknown",
          createdBy: grn.createdBy
            ? `${grn.createdBy.firstName} ${grn.createdBy.lastName}`
            : "Unknown",
          billedAmount: item.billedAmount || 0,
          billedTotalCost: item.billedTotalCost || 0,
          paidAmount: item.paidAmount || 0,
          remainingBalance: item.remainingBalance || 0,
          status: item.status, // should be Completed
          completedAt: item.changedAt || grn.updatedAt,
          createdAt: grn.createdAt,
        });
      });
    });

    return res.status(200).json({
      success: true,
      data: reportData,
      message: "Fully paid billed items fetched successfully",
    });
  } catch (err) {
    console.error("Error fetching fully paid billed items report:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch fully paid billed items report",
      error: err.message,
    });
  }
};
