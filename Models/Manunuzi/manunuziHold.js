

import mongoose from "mongoose";

const poSchema = mongoose.Schema(   {
    grnSessionId: {
      type: String,
      required: true,
    },
      allItems: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: "items", required: true },
      requiredQuantity: { type: Number, required: true },
      description: { type: String },
    }
  ],
  },
  { timestamps: true });

export default mongoose.model('po', poSchema);

