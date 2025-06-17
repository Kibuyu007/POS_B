import poGrn from "../../Models/Manunuzi/poGrn.js";
import Items from "../../Models/Items/items.js";
import supplier from "../../Models/Manunuzi/supplier.js";
import { v4 as uuidv4 } from "uuid";

// export const addPoGrn = async (req, res) => {
//   const {
//     items,
//     supplierName,
//     invoiceNumber,
//     lpoNumber,
//     deliveryPerson,
//     deliveryNumber,
//     description,
//     receivingDate,
//     grnNumber
//   } = req.body;
//   const createdBy = req.userId;

//   if (!Array.isArray(items) || items.length === 0) {
//     return res.status(400).json({
//       success: false,
//       message: "Items must be a non-empty array",
//     });
//   }

//   try {
//     const supplierDetails = await supplier.findOne({
//       supplierName: { $regex: new RegExp(`^${supplierName.trim()}$`, "i") },
//     });

//     if (!supplierDetails) {
//       return res.status(404).json({
//         success: false,
//         message: "Supplier not found",
//       });
//     }

//     const stockIdentifier = uuidv4();

//     const newStockItems = await Promise.all(
//       items.map(async (item) => {
//         const itemDetails = await Items.findOne({ name: item.name });

//         if (!itemDetails) {
//           throw new Error(`Item ${item.name} not found`);
//         }

//         itemDetails.itemQuantity += item.receivedQuantity;
//         itemDetails.manufactureDate = item.manufactureDate;
//         itemDetails.expireDate = item.expiryDate;
//         itemDetails.price = item.newSellingPrice;

//         await itemDetails.save();

//         const newStockDetails = new poGrn({
//           stockIdentifier,
//           items: [
//             {
//               name: itemDetails._id,
//               requiredQuantity: item.requiredQuantity,
//               receivedQuantity: item.receivedQuantity,
//               outstandingQuantity:
//                 item.requiredQuantity - item.receivedQuantity,
//               newBuyingPrice: item.newBuyingPrice,
//               newSellingPrice: item.newSellingPrice,
//               batchNumber: item.batchNumber,
//               manufactureDate: item.manufactureDate,
//               expiryDate: item.expiryDate,
//               receivedDate: item.receivedDate || new Date(),
//               foc: item.foc,
//               rejected: item.rejected,
//               comments: item.comments,
//               totalCost: item.totalCost,
//               status: item.status || "Completed",
//             },
//           ],
//           supplierName: supplierDetails._id,
//           invoiceNumber,
//           lpoNumber,
//           deliveryPerson,
//           deliveryNumber,
//           description,
//           receivingDate,
//           createdBy,
//           grnNumber,
//         });

//         const saved = await newStockDetails.save();
//         return saved.toObject();
//       })
//     );

//     return res.status(200).json({
//       success: true,
//       message: "New stock added successfully",
//       data: newStockItems,
//     });
//   } catch (error) {
//     console.error("Error adding new stock:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to add new stock",
//       error: error.message,
//     });
//   }
// };



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
    grnNumber,
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
    const itemEntries = [];

    for (const item of items) {
      const itemDetails = await Items.findOne({ name: item.name });

      if (!itemDetails) {
        return res.status(404).json({
          success: false,
          message: `Item ${item.name} not found`,
        });
      }

      // Update item quantity and details
      itemDetails.itemQuantity += item.receivedQuantity;
      itemDetails.manufactureDate = item.manufactureDate;
      itemDetails.expireDate = item.expiryDate;
      itemDetails.price = item.newSellingPrice;
      await itemDetails.save();

      // Add item to list
      itemEntries.push({
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
      });
    }

    // Save one GRN document with all items
    const newGrn = new poGrn({
      stockIdentifier,
      items: itemEntries,
      supplierName: supplierDetails._id,
      invoiceNumber,
      lpoNumber,
      deliveryPerson,
      deliveryNumber,
      description,
      receivingDate,
      createdBy,
      grnNumber,
    });

    const saved = await newGrn.save();

    res.status(200).json({
      success: true,
      message: "New GRN added with all items",
      data: saved,
    });
  } catch (error) {
    console.error("Error adding GRN:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to add GRN",
      error: error.message,
    });
  }
};



export const outstandingGrn = async (req, res) => {
  try {
    const records = await poGrn
      .find({ "items.outstandingQuantity": { $gt: 0 } })
      .populate("items.name", "name")
      .populate("supplierName", "supplierName")
      .populate("createdBy", "username")
      .select("items supplierName invoiceNumber receivingDate createdBy createdAt")
      .lean();

    const outstandingItems = [];

    records.forEach((record) => {
      record.items.forEach((item) => {
        if (item.outstandingQuantity > 0) {
          outstandingItems.push({
            grnId: record._id,
            itemId: item.name._id,
            name: item.name.name,
            supplier: record.supplierName?.supplierName || "Unknown",
            requiredQuantity: item.requiredQuantity,
            outstandingQuantity: item.outstandingQuantity,
            newBuyingPrice: item.newBuyingPrice,
            invoiceNumber: record.invoiceNumber,
            receivingDate: record.receivingDate,
            createdBy: record.createdBy?.username || "N/A",
            createdAt: record.createdAt,
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



export const getGrnPo = async (req, res) => {
  const { id } = req.params;

  try {
    const grn = await poGrn.findById(id)
      .populate("items.name", "name")
      .populate("supplierName", "supplierName")
      .populate("createdBy", "username")
      .lean();

    if (!grn) {
      return res.status(404).json({ success: false, message: "GRN not found" });
    }

    // Prepare data for modal
    const formattedItems = grn.items.map((item) => ({
      name: item.name?.name || "Unknown Item",
      requiredQuantity: item.requiredQuantity,
      receivedQuantity: item.receivedQuantity,
      outstandingQuantity: item.outstandingQuantity,
      batchNumber: item.batchNumber,
      newBuyingPrice: item.newBuyingPrice,
      newSellingPrice: item.newSellingPrice,
      manufactureDate: item.manufactureDate,
      expiryDate: item.expiryDate,
      foc: item.foc,
      rejected: item.rejected,
      comments: item.comments,
      totalCost: item.totalCost,
      status: item.status,
    }));

    res.status(200).json({
      success: true,
      grnNumber: grn.grnNumber,
      supplierName: grn.supplierName?.supplierName || "Unknown Supplier",
      invoiceNumber: grn.invoiceNumber,
      receivingDate: grn.receivingDate,
      createdBy: grn.createdBy?.username || "Unknown",
      items: formattedItems,
    });
  } catch (error) {
    console.error("Error fetching GRN details:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GRN items",
    });
  }
};



export const updateOutstand = async (req, res) => {
const { grnId, itemId, filledQuantity } = req.body;

  if (!grnId || !itemId || !filledQuantity || filledQuantity <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  try {
    const grn = await poGrn.findById(grnId);
    if (!grn) return res.status(404).json({ success: false, message: "GRN not found" });

    const item = grn.items.find((i) => i.name.toString() === itemId);
    if (!item) return res.status(404).json({ success: false, message: "Item not found in GRN" });

    if (item.outstandingQuantity < filledQuantity) {
      return res.status(400).json({ success: false, message: "Filled quantity exceeds outstanding" });
    }

    item.receivedQuantity += filledQuantity;
    item.outstandingQuantity -= filledQuantity;

    await grn.save();

    // Update actual item stock
    const stockItem = await Items.findById(itemId);
    if (!stockItem) return res.status(404).json({ success: false, message: "Item not found in stock" });

    stockItem.itemQuantity += filledQuantity;
    await stockItem.save();

    res.status(200).json({ success: true, message: "GRN and stock updated successfully" });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const biilledItems = async (req, res) => {
  try {
    const records = await poGrn
      .find({ "items.status": "Billed" })
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
