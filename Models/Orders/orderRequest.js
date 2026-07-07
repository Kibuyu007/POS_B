import mongoose from "mongoose";

const requestItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "items",
      required: true,
    },
    itemName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    items: {
      type: [requestItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "Request must contain at least one item",
      },
    },
    notes: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      enum: ["Website", "WhatsApp", "Manual"],
      default: "Website",
    },
    status: {
      type: String,
      enum: ["Pending", "Rejected", "Converted"],
      default: "Pending",
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("requests", requestSchema);