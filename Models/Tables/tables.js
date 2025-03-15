import mongoose  from "mongoose";


const tablesScheema = mongoose.Schema(
    {
        tableNo: {
            type: Number,required: true,
        },

        tableStatus: {
            type: String,
            required: true,
            enum: ["available", "booked", "not in use"],
            default: "available"
        },

        currentOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "orders",
            default: null
        }
        
    }, {timestamps: true}
);

export default mongoose.model("tables", tablesScheema)