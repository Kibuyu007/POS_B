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

export const completedNonPo = async (req, res) => {
  try {
    const allGrns = await newGrn.find()
      .populate("supplierName", "supplierName")
      .populate("items.name", "name");

    res.status(200).json({
      success: true,
      data: allGrns,
      message: "All new GRNs fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching new GRNs:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch new GRNs",
      error: error.message,
    });
  }
};


export const billedItemsNonPo = async (req, res) => {
  try {
    const billedGrns = await newGrn.find({ "items.status": "Billed" })
      .populate("items.name", "name") 
      .populate("supplierName", "supplierName");

    const billedItems = [];

    billedGrns.forEach((grn) => {
      grn.items.forEach((item) => {
        if (item.status === "Billed") {
          billedItems.push({
            id: item._id,
            itemName: item.name.name, 
            buyingPrice: item.buyingPrice,
            sellingPrice: item.sellingPrice,
            quantity: item.quantity,
            supplier: grn.supplierName.supplierName,
            invoiceNumber: grn.invoiceNumber,
            receivingDate: grn.receivingDate,
          });
        }
      });
    });

    return res.status(200).json({
      success: true,
      data: billedItems,
      message: "Billed items fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching billed items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch billed items",
      error: error.message,
    });
  }
};
