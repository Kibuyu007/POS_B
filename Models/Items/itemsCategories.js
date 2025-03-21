import mongoose from 'mongoose'

const itemCategoriesScheema = mongoose.Schema(
    {
        
        name: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true
        },

    },

    { timestamps: true}
);

export default mongoose.model("categories", itemCategoriesScheema)