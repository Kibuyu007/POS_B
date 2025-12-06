import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  amount: Number,
  date: { type: Date, default: Date.now }
});

const debtSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    phone: { type: String },
    totalAmount: { type: Number, required: true },
    remainingAmount: { type: Number, required: true },
    status: { type: String, default: "pending" }, // pending | cleared
    payments: [paymentSchema]
  },
  { timestamps: true }
);

export default mongoose.model("Debt", debtSchema);
