import mongoose from 'mongoose'

const itemsScheema = mongoose.Schema(
    {
        
        name: {
            type: String,
            required: true,
        },

        price: {
            type: Number,
            required: true
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Categories',
            required: true
        },
        

        qrCode: {
            type: String,
            required: false,
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
        status: { type: String, enum: ["Active", "Expired"], default: "Active" },

    },

    { timestamps: true}
);

export default mongoose.model("items", itemsScheema)