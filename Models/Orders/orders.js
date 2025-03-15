import mongoose  from "mongoose";


const orderScheema = mongoose.Schema(
    {
        customerDetails: {
            customerName: {type: String,required: true},
            customerAddress: {type: String,required: true},
            customerContact: {type: Number,required: true},
        },

        orderStatus: {
            type: String,
            required: true
        },

        orderDate : {
            type: String,
            default: Date.now()
        },

        bills: {
            total: {type: Number, required: true},
            tax: {type: Number, required: true},
            finalTotal: {type: Number, required: true},
            
        },

        items: [],
        table: {type: mongoose.Schema.Types.ObjectId, ref: "tables"}
        
    }, {timestamps: true}
);

export default mongoose.model("orders", orderScheema)