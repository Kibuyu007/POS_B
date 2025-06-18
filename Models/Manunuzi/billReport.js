import mongoose from "mongoose";

const billReportSchema = new mongoose.Schema(
  {
    grnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PoGrn",
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Items",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("billed", billReportSchema);
