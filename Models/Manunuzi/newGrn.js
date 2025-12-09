import mongoose from "mongoose";

const newGrnSchema = new mongoose.Schema(
  {
    stockIdentifier: { type: String, required: true },

    items: [
      {
        name: { type: mongoose.Schema.Types.ObjectId, ref: "items" },
        quantity: Number,
        buyingPrice: Number,
        sellingPrice: Number,
        batchNumber: String,
        manufactureDate: Date,
        expiryDate: Date,
        receivedDate: Date,
        foc: String,
        rejected: String,

        // BILLING FIELDS
        billedAmount: { type: Number, default: 0 },
        billedTotalCost: { type: Number, default: 0 },
        paidAmount: { type: Number, default: 0 },
        remainingBalance: { type: Number, default: 0 },
        isFullyPaid: { type: Boolean, default: false },

        comments: String,
        totalCost: Number,

        status: {
          type: String,
          enum: ["Billed", "Completed"],
          default: "Completed",
        },

        changedAt: { type: Date, default: Date.now },
      },
    ],

    supplierName: { type: mongoose.Schema.Types.ObjectId, ref: "supplier" },
    invoiceNumber: String,
    lpoNumber: String,
    deliveryPerson: String,
    deliveryNumber: String,
    description: String,
    receivingDate: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  },
  { timestamps: true }
);

export default mongoose.model("newGrn", newGrnSchema);
