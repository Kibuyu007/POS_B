import mongoose from "mongoose";

const itemsScheema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Categories",
      required: true,
    },

    barCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expireDate: {
      type: Date,
      required: true,
    },

    manufactureDate: {
      type: Date,
      required: true,
    },

    itemQuantity: {
      type: Number,
      required: true,
      default: 0,
    },
    reOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    status: { type: String, enum: ["Active", "Expired"], default: "Active" },
    reOrderStatus: {
      type: String,
      enum: ["Low", "Normal"],
      default: "Normal",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
  },

  { timestamps: true }
);

export default mongoose.model("items", itemsScheema);
