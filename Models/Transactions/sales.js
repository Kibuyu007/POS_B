import mongoose from "mongoose";

const salesSchema = mongoose.Schema(
  {
    saleType: {
      type: String,
      enum: ["Retail", "Wholesale"],
      default: "Retail",
    },

    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "items",
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
        },

        price: {
          type: Number,
          required: true, // price USED (retail or wholesale)
        },

        priceType: {
          type: String,
          enum: ["Retail", "Wholesale"],
          default: "Retail",
        },

        buyingPrice: {
          type: Number,
          required: true,
        },

        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],

    subTotal: {
      type: Number,
      required: true,
    },

    tradeDiscount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
    },

    customerDetails: {
      name: String,
      phone: String,
    },

    loyalCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    status: {
      type: String,
      enum: ["Paid", "Bill"],
      default: "Paid",
    },

    paidAmount: {
      type: Number,
      default: 0,
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
  { timestamps: true ,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
  
);


salesSchema.virtual("balance").get(function () {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

export default mongoose.model("sales", salesSchema);