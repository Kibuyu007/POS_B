import poGrn from "../../Models/Manunuzi/poGrn.js";
import Items from "../../Models/Items/items.js";
import supplier from "../../Models/Manunuzi/supplier.js";
import { v4 as uuidv4 } from "uuid";

export const addPoGrn = async (req, res) => {
  const {
    items,
    supplierName,
    invoiceNumber,
    lpoNumber,
    deliveryPerson,
    deliveryNumber,
    description,
    receivingDate,
  } = req.body;
  const createdBy = req.userId;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Items must be a non-empty array",
    });
  }

  try {
    const supplierDetails = await supplier.findOne({
      supplierName: { $regex: new RegExp(`^${supplierName.trim()}$`, "i") },
    });

    if (!supplierDetails) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const stockIdentifier = uuidv4();

    const newStockItems = await Promise.all(
      items.map(async (item) => {
        const itemDetails = await Items.findOne({ name: item.name });

        if (!itemDetails) {
          throw new Error(`Item ${item.name} not found`);
        }

        itemDetails.itemQuantity += item.receivedQuantity;
        itemDetails.manufactureDate = item.manufactureDate;
        itemDetails.expireDate = item.expiryDate;
        itemDetails.price = item.newSellingPrice;

        await itemDetails.save();

        const newStockDetails = new poGrn({
          stockIdentifier,
          items: [
            {
              name: itemDetails._id,
              requiredQuantity: item.requiredQuantity,
              receivedQuantity: item.receivedQuantity,
              outstandingQuantity: item.requiredQuantity - item.receivedQuantity,
              newBuyingPrice: item.newBuyingPrice,
              newSellingPrice: item.newSellingPrice,
              batchNumber: item.batchNumber,
              manufactureDate: item.manufactureDate,
              expiryDate: item.expiryDate,
              receivedDate: item.receivedDate || new Date(),
              foc: item.foc,
              rejected: item.rejected,
              comments: item.comments,
              totalCost: item.totalCost,
              status: item.status || "Completed",
            },
          ],
          supplierName: supplierDetails._id,
          invoiceNumber,
          lpoNumber,
          deliveryPerson,
          deliveryNumber,
          description,
          receivingDate,
          createdBy,
        });

        const saved = await newStockDetails.save();
        return saved.toObject();
      })
    );

    return res.status(200).json({
      success: true,
      message: "New stock added successfully",
      data: newStockItems,
    });
  } catch (error) {
    console.error("Error adding new stock:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to add new stock",
      error: error.message,
    });
  }
};


export const outstandingGrn = async (req, res) => {
  try {
    
    const records = await poGrn.find({ "items.outstandingQuantity": { $gt: 0 } })
      .populate("items.name", "name") 
      .populate("supplierName", "supplierName") 
      .lean();

    const outstandingItems = [];

    records.forEach((record) => {
      record.items.forEach((item) => {
        if (item.outstandingQuantity > 0) {
          outstandingItems.push({
            itemId: item.name._id,
            itemName: item.name.name,
            supplier: record.supplierName?.supplierName || "Unknown",
            requiredQuantity: item.requiredQuantity,
            outstandingQuantity: item.outstandingQuantity,
            newBuyingPrice: item.newBuyingPrice,
            invoiceNumber: record.invoiceNumber,
            receivingDate: record.receivingDate,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: outstandingItems,
    });
  } catch (error) {
    console.error("Error fetching outstanding items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch outstanding items",
    });
  }
};


export const biilledItems = async (req, res) => {
  try {
    const records = await poGrn.find({ "items.status": "Billed" })
      .populate("items.name", "name")
      .populate("supplierName", "supplierName") 
      .lean();

    const billedItems = [];

    records.forEach((record) => {
      record.items.forEach((item) => {
        if (item.status === "Billed") {
          billedItems.push({
            itemId: item.name._id,
            itemName: item.name.name,
            supplier: record.supplierName?.supplierName || "Unknown",
            newBuyingPrice: item.newBuyingPrice,
            newSellingPrice: item.newSellingPrice,
            quantity: item.receivedQuantity,
            invoiceNumber: record.invoiceNumber,
            receivingDate: record.receivingDate,
            batchNumber: item.batchNumber,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: billedItems,
    });
  } catch (error) {
    console.error("Error fetching billed items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch billed items",
    });
  }
};

