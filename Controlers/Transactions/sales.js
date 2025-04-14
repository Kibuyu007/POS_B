import Sales from "../../Models/Transactions/sales.js";
import Item from "../../Models/Items/items.js";

export const storeTransaction = async (req, res) => {
  try {
    const { items, totalAmount, customerDetails, status } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided." });
    }

    if (!["paid", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    // Check for insufficient stock if status is "paid"
    if (status === "paid") {
      for (const soldItem of items) {
        const item = await Item.findById(soldItem.item);

        if (!item || item.quantity < soldItem.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for item: ${item?.name || "Unknown"}`,
          });
        }
      }
    }

    // Save the sale
    const sale = new Sales({
      items,
      totalAmount,
      customerDetails,
      status,
    });

    await sale.save();

    // Update item quantities if transaction is "paid"
    if (status === "paid") {
      for (const soldItem of items) {
        await Item.findByIdAndUpdate(soldItem.item, {
          $inc: { quantity: -soldItem.quantity },
        });
      }
    }

    return res.status(201).json({ message: "Transaction successful.", sale });
  } 
  
  catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Transaction failed. Please contact the administrator.",
    });
  }
};
