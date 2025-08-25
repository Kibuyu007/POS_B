import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  depositAmount: { type: Number, default: 0 },
  withdrawAmount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Deposit", depositSchema);