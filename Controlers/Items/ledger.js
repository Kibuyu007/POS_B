// utils/stockLedger.js
import mongoose from "mongoose";
import StockLedger from "../../Models/Items/ledger.js";
import Item from "../../Models/Items/items.js";

export const postStockMovement = async ({
  itemId,
  docNo,
  narration,
  received = 0,
  sold = 0,
  adjustmentIn = 0,
  adjustmentOut = 0,
  reason,
  employeeId,
  session, // Required for transactions
}) => {
  const item = await Item.findById(itemId).session(session);
  if (!item) throw new Error(`Item not found: ${itemId}`);

  // Calculate new balance based on all movements
  const previousBalance = item.itemQuantity;
  const newBalance =
    previousBalance + received + adjustmentIn - sold - adjustmentOut;

  if (newBalance < 0) {
    throw new Error(
      `Insufficient stock for item: ${item.name}. Available: ${previousBalance}, Requested Out: ${sold + adjustmentOut}`,
    );
  }

  // Update Item quantity
  item.itemQuantity = newBalance;
  await item.save({ session });
  console.log(`Item quantity updated to ${newBalance}`);

  // Write to Ledger
  const ledgerEntry = new StockLedger({
    itemId,
    docNo,
    narration,
    received,
    sold,
    adjustmentIn,
    adjustmentOut,
    runningBalance: newBalance,
    reason,
    employeeId,
  });

  await ledgerEntry.save({ session });

  return ledgerEntry;
};

/* =========================================================


   2. MAIN TABLE: Get the Stock Ledger for a specific item
========================================================= */
export const getStockLedger = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { startDate, endDate } = req.query;

    if (!itemId) {
      return res
        .status(400)
        .json({ success: false, message: "Item ID is required" });
    }

    // Build the filter
    const filter = { itemId: new mongoose.Types.ObjectId(itemId) };

    // Add Date Range Filter if provided
    if (startDate && endDate) {
      filter.docDate = {
        $gte: new Date(startDate),
        // Set to end of the day (23:59:59) so we don't miss entries on the endDate
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    // Fetch the ledger records, oldest first
    const ledger = await StockLedger.find(filter)
      .sort({ docDate: 1, createdAt: 1 })
      .populate("employeeId", "firstName lastName") // Fetch user details for the "Employee" column
      .lean();

    // Format the data exactly for your table
    const formattedData = ledger.map((row) => ({
      _id: row._id,
      docNo: row.docNo,
      docDate: row.docDate,
      narration: row.narration,
      received: row.received,
      sold: row.sold,
      adjustmentIn: row.adjustmentIn,
      adjustmentOut: row.adjustmentOut,
      runningBalance: row.runningBalance,
      reason: row.reason,
      // Handle cases where the user was deleted or not populated
      employee: row.employeeId
        ? `${row.employeeId.firstName || ""} ${row.employeeId.lastName || ""}`.trim()
        : "System",
    }));

    return res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Error fetching stock ledger:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
