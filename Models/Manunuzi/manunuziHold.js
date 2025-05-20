

import mongoose from "mongoose";

const holdSchema = mongoose.Schema(  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    buyingPrice: { type: Number, required: true },
    units: { type: Number, required: true },
    itemsPerUnit: { type: Number, required: true },
    quantity: { type: Number, required: true },
    rejected: { type: Number, default: 0 },
    foc: { type: Number, default: 0 },
    batchNumber: { type: String },
    manufactureDate: { type: Date },
    expiryDate: { type: Date },
    receivedDate: { type: Date, default: Date.now },
    comments: { type: String },
  },
  { timestamps: true });

export default mongoose.model('hold', holdSchema);
