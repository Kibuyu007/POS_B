import newGrn from "../../Models/Manunuzi/newGrn.js";
import Items from "../../Models/Items/items.js";
import supplier from "../../Models/Manunuzi/supplier.js";
import { v4 as uuidv4 } from "uuid";

export const addNewGrn = async (req, res) => {
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

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Items must be a non-empty array" });
  }

  try {
    const supplierDetails = await supplier.findOne({
      supplierName: { $regex: new RegExp(`^${supplierName.trim()}$`, "i") },
    });

    if (!supplierDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    const stockIdentifier = uuidv4();

    const newStockItems = await Promise.all(
      items.map(async (item) => {
        const itemDetails = await Items.findOne({ name: item.name });
        console.log("Received items:", items);
        if (!itemDetails) {
          throw new Error(`Item ${item.name} not found`);
        }

        itemDetails.itemQuantity += item.quantity;
        itemDetails.manufactureDate = item.manufactureDate;
        itemDetails.expireDate = item.expiryDate;
        itemDetails.price = item.sellingPrice;

        await itemDetails.save();

        const newStockDetails = new newGrn({
          stockIdentifier,
          items: [
            {
              name: itemDetails._id,
              quantity: item.quantity,
              buyingPrice: item.buyingPrice,
              sellingPrice: item.sellingPrice,
              batchNumber: item.batchNumber,
              manufactureDate: item.manufactureDate,
              expiryDate: item.expiryDate,
              receivedDate: item.receivedDate || new Date().toISOString(),
              foc: item.foc,
              rejected: item.rejected,
              comments: item.comments,
              totalCost: item.totalCost,
            },
          ],
          supplierName: supplierDetails._id,
          invoiceNumber,
          lpoNumber,
          deliveryPerson,
          deliveryNumber,
          description,
          receivingDate,
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
