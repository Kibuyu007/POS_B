import mongoose from "mongoose";

const itemsScheema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    // ===== RETAIL PRICE =====
    price: {
      type: Number,
      required: true,
    },

    // ===== WHOLESALE SETTINGS =====
    wholesalePrice: {
      type: Number,
      default: 0, // 0 = not set
    },

    wholesaleMinQty: {
      type: Number,
      default: 0, // 0 = no minimum
    },

    enableWholesale: {
      type: Boolean,
      default: false,
    },

    buyingPrice: {
      type: Number,
      default: 0,
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
      default: 0,
    },

    reOrder: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Expired"],
      default: "Active",
    },

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