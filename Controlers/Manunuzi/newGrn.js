import mongoose from "mongoose";
import newGrn from "../../Models/Manunuzi/newGrn.js";
import Items from "../../Models/Items/items.js";
import supplier from "../../Models/Manunuzi/supplier.js";
import billedNon from "../../Models/Manunuzi/billNonReport.js";
import { v4 as uuidv4 } from "uuid";
import { postStockMovement } from "../Items/ledger.js";


export const addNewGrn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      items, supplierName, invoiceNumber, lpoNumber,
      deliveryPerson, deliveryNumber, description, receivingDate,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Items must be a non-empty array" });
    }

    // 1. Find Supplier
    const supplierDetails = await supplier.findOne({
      supplierName: { $regex: new RegExp(`^${supplierName.trim()}$`, "i") },
    }).session(session);

    if (!supplierDetails) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    const stockIdentifier = uuidv4();
    const itemsToSave = [];

    // 2. Process items
    for (const item of items) {
      const itemDetails = await Items.findOne({ name: item.name }).session(session);
      if (!itemDetails) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: `Item not found: ${item.name}` });
      }

      const receivedQty  = Number(item.quantity) || 0;
      const billedAmount = Number(item.billedAmount) || 0;
      const buyingPrice  = Number(item.buyingPrice) || 0;
      const sellingPrice = Number(item.sellingPrice) || 0;
      const wholesaleMinQty = Number(item.wholesaleMinQty) || 0;
      const wholesalePrice  = Number(item.wholesalePrice) || 0;
      const enableWholesale = wholesaleMinQty > 0 && wholesalePrice > 0;

      // Update master fields (Prices, Dates, etc.)
      itemDetails.manufactureDate = item.manufactureDate;
      itemDetails.expireDate = item.expiryDate;
      if (sellingPrice > 0) itemDetails.price = sellingPrice;
      if (enableWholesale) {
        itemDetails.enableWholesale = true;
        itemDetails.wholesaleMinQty = wholesaleMinQty;
        itemDetails.wholesalePrice = wholesalePrice;
      }
      
  

      const billedTotalCost = billedAmount * buyingPrice;
      const status = billedAmount > 0 ? "Billed" : "Completed";
      
      // Total stock entering the system (Actual received + Billed Amount)
      const totalIn = receivedQty + billedAmount;

      // 3. Log the inbound movement to the Ledger
      if (totalIn > 0) {
        await postStockMovement({
          itemId: itemDetails._id,
          docNo: invoiceNumber || `GRN-${stockIdentifier.slice(0, 6).toUpperCase()}`,
          narration: `GRN Received from ${supplierDetails.supplierName}`,
          received: totalIn, // Stock coming in
          sold: 0,           // Default
          adjustmentIn: 0,   // Default
          adjustmentOut: 0,  // Default
          reason: "Purchase",
          employeeId: req.userId,
          session,           // Pass the transaction session
        });
      }

      // Prepare GRN item snapshot
      itemsToSave.push({
        name: itemDetails._id,
        quantity: receivedQty,
        buyingPrice,
        sellingPrice,
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
        remainingBalance: billedTotalCost,
        isFullyPaid: false,
        comments: item.comments,
        totalCost: item.totalCost,
        status,
        changedAt: new Date(),
      });
    }

    // 4. Save the GRN Document
    const newStockDetails = new newGrn({
      stockIdentifier,
      items: itemsToSave,
      supplierName: supplierDetails._id,
      invoiceNumber, lpoNumber, deliveryPerson, deliveryNumber,
      description, receivingDate,
      createdBy: req.userId,
    });

    const saved = await newStockDetails.save({ session });

    // 5. Commit the transaction (Saves Item Quantities, Ledger, and GRN)
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "New stock added successfully",
      data: saved,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Error adding new stock:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to add new stock", 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};


//Get All Non PO GRNs
export const completedNonPo = async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search/filter parameters
    const searchTerm = req.query.search || "";
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // Build filter object
    let filter = {};

    // Search by supplier name or GRN number
    if (searchTerm) {
      // First find suppliers matching the search term
      const suppliers = await Supplier.find({
        supplierName: { $regex: searchTerm, $options: "i" },
      }).select("_id");

      const supplierIds = suppliers.map((s) => s._id);

      filter.$or = [
        { grnNumber: { $regex: searchTerm, $options: "i" } },
        { supplierName: { $in: supplierIds } },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.receivingDate = {};
      if (startDate) {
        filter.receivingDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.receivingDate.$lte = new Date(endDate);
      }
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Fetch paginated GRNs
    const allGrns = await newGrn
      .find(filter)
      .populate("supplierName", "supplierName")
      .populate("createdBy", "userName")
      .populate("items.name", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count with filter
    const totalCount = await newGrn.countDocuments(filter);

    // Calculate costs efficiently
    let totalItemCost = 0;
    let todayTotalCost = 0;

    for (const order of allGrns) {
      const orderDate = new Date(order.receivingDate || order.createdAt)
        .toISOString()
        .split("T")[0];

      const orderTotal = order.items.reduce((sum, item) => {
        return sum + (item.totalCost || 0);
      }, 0);

      totalItemCost += orderTotal;

      if (orderDate === today) {
        todayTotalCost += orderTotal;
      }
    }

    // Pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: allGrns,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
      summary: {
        totalItemCost,
        todayTotalCost,
      },
      message: "GRNs fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching GRNs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GRNs",
      error: error.message,
    });
  }
};

// Get all Billed Items in Non PO GRNs
export const billedItemsNonPo = async (req, res) => {
  try {
    const grns = await newGrn
      .find({ "items.status": "Billed" })
      .populate("supplierName", "supplierName")
      .populate("createdBy", "firstName lastName")
      .populate("items.name", "name")
      .sort({ createdAt: -1 })
      .lean();

    const supplierBills = {};

    grns.forEach((grn) => {
      const supplierId = grn.supplierName?._id?.toString() || "unknown";

      // Initialize supplier bill if not exists
      if (!supplierBills[supplierId]) {
        supplierBills[supplierId] = {
          supplierId,
          supplierName: grn.supplierName?.supplierName || "Unknown",
          createdBy: grn.createdBy
            ? `${grn.createdBy.firstName} ${grn.createdBy.lastName}`
            : "Unknown",
          items: [],
          totalBilledAmount: 0,
          totalPaidAmount: 0,
          totalRemainingBalance: 0,
        };
      }

      // Filter only pending billed items
      const billedItems = grn.items.filter(
        (item) => item.status === "Billed" && item.remainingBalance > 0
      );

      billedItems.forEach((item) => {
        supplierBills[supplierId].items.push({
          grnId: grn._id,
          itemId: item._id,
          name: item.name?.name || "Unknown",
          quantity: item.quantity,
          buyingPrice: item.buyingPrice,
          billedAmount: item.billedAmount || 0,
          billedTotalCost: item.billedTotalCost || 0,
          paidAmount: item.paidAmount || 0,
          remainingBalance: item.remainingBalance || 0,
          isFullyPaid: item.isFullyPaid || false,
          createdAt: grn.createdAt,
        });

        // Totals per supplier
        supplierBills[supplierId].totalBilledAmount +=
          item.billedTotalCost || 0;
        supplierBills[supplierId].totalPaidAmount +=
          item.paidAmount || 0;
        supplierBills[supplierId].totalRemainingBalance +=
          item.remainingBalance || 0;
      });
    });

    return res.status(200).json({
      success: true,
      data: Object.values(supplierBills),
      message: "Supplier bills fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching billed GRNs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch billed supplier bills",
      error: error.message,
    });
  }
};


// Make payment for billed GRN itemm
export const makePartialPaymentOld = async (req, res) => {
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

// Make payment for billed GRN items by supplier (FIFO)
export const makePartialPayment = async (req, res) => {
  const { supplierId, paymentAmount } = req.body;

  if (!supplierId || !paymentAmount || paymentAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "supplierId and positive paymentAmount are required",
    });
  }

  try {
    // Get all GRNs for this supplier with billed items
    const grns = await newGrn
      .find({
        supplierName: supplierId,
        "items.status": "Billed",
      })
      .sort({ createdAt: 1 }); // FIFO: oldest first

    if (!grns.length) {
      return res.status(404).json({
        success: false,
        message: "No billed items found for this supplier",
      });
    }

    let remainingPayment = Number(paymentAmount);
    const updatedItems = [];

    for (const grn of grns) {
      for (const item of grn.items) {
        if (
          item.status !== "Billed" ||
          item.remainingBalance <= 0 ||
          remainingPayment <= 0
        ) {
          continue;
        }

        const deduction = Math.min(
          item.remainingBalance,
          remainingPayment
        );

        item.paidAmount = (item.paidAmount || 0) + deduction;
        item.remainingBalance -= deduction;
        remainingPayment -= deduction;

        if (item.remainingBalance === 0) {
          item.isFullyPaid = true;
          item.status = "Completed";
        }

        item.changedAt = new Date();

        updatedItems.push({
          grnId: grn._id,
          itemId: item._id,
          name: item.name,
          paidNow: deduction,
          remainingBalance: item.remainingBalance,
          status: item.status,
        });
      }

      await grn.save();

      if (remainingPayment <= 0) break;
    }

    return res.status(200).json({
      success: true,
      message: "Supplier payment applied successfully",
      data: {
        supplierId,
        totalPaid: paymentAmount - remainingPayment,
        remainingUnallocated: remainingPayment,
        updatedItems,
      },
    });
  } catch (error) {
    console.error("Error paying supplier bill:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to apply supplier payment",
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
