import Tables from "../../Models/Tables/tables.js";
import mongoose from 'mongoose';




// Create a new table
export const createTable = async (req, res) => {
    try {
        const { tableNo, tableStatus, currentOrder } = req.body;


        // Check if the table number already exists
        const existingTable = await Tables.findOne({ tableNo });
        if (existingTable) {
            return res.status(400).json({ error: "Table already exists!" });
        }

        // Create table
        const newTable = await Tables.create({
            tableNo,
            tableStatus,
            currentOrder: currentOrder || null //<tr className="h-3" />
        });

        res.status(201).json({ message: "Table created successfully", table: newTable });


    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




//Get all tables
export const getTables = async (req, res) => {
    try {
        const tables = await Tables.find().populate("currentOrder"); 
        res.status(200).json(tables);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};




//Update table
export const updateTable = async (req, res) => {
    try {
       
        const { tableStatus, currentOrder } = req.body;
        const { id } = req.params;


       // Check if the provided ID is valid
           if (!mongoose.Types.ObjectId.isValid(id)) {
             return res.status(400).json({ error: "Invalid Order ID" });
           }


        // Update table
        const updatedTable = await Tables.findByIdAndUpdate(
            id,
            { tableStatus, currentOrder},
            { new: true } 
        );

        if (!updatedTable) {
            return res.status(404).json({ error: "Table not found!" });
        }

        res.status(200).json({ message: "Table updated successfully", table: updatedTable });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
