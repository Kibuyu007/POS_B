import mongoose from "mongoose";

const stockLedgerSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "items",
      required: true,
      index: true,
    },
    docNo: { type: String, required: true },
    docDate: { type: Date, default: Date.now },
    narration: { type: String, required: true },

    // Quantities
    received: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
    adjustmentIn: { type: Number, default: 0 },
    adjustmentOut: { type: Number, default: 0 },

    runningBalance: { type: Number, required: true },
    reason: { type: String, required: true },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  { timestamps: true },
);

stockLedgerSchema.index({ itemId: 1, docNo: 1, reason: 1 }, { unique: true });

export default mongoose.model("StockLedger", stockLedgerSchema);
