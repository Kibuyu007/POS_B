import mongoose from "mongoose";

const billNonReportSchema = new mongoose.Schema(
  {
   grnId: { type: mongoose.Schema.Types.ObjectId, ref: "newGrn" },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "items" },
  itemName: String,
  grnNumber: String,
  buyingPrice: Number,
  oldStatus: String,
  supplier: String,
  newStatus: String,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
  changedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("billedNon", billNonReportSchema);
