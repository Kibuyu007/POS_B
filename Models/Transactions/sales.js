import mongoose from "mongoose";

const salesScheema = mongoose.Schema(
  {
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
          required: true,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    customerDetails: {
      name: String,
      phone: String,
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
    
    //  user: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "users",
    //   required: true,
    // },
  },
  { timestamps: true }
);

export default mongoose.model("sales", salesScheema);
