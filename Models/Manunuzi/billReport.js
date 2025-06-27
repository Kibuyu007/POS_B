import mongoose from "mongoose";

const billReportSchema = new mongoose.Schema(
 {
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "newGrn",
      required: true,
    },
    itemId: { type: mongoose.Schema.Types.ObjectId },
    itemName: { type: String, required: true },
    supplier: { type: String },
    buyingPrice: { type: Number },
    oldStatus: { type: String, default: "Billed" },
    newStatus: { type: String, default: "Completed" },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("billed", billReportSchema);
