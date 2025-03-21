import mongoose from "mongoose";
import items from "../../Models/Items/items.js";




// Add New Item
export const addNewItem = async (req, res) => {
  try {
    const { name, price, category, qrCode, expireDate, manufactureDate, itemQuantity } = req.body;

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ success: false, message: "Invalid category ID" });
    }

    // Ensure itemQuantity is non-negative
    const safeItemQuantity = Math.max(0, itemQuantity || 0);

    const newItem = new items({
      name,
      price,
      category,
      qrCode,
      expireDate,
      manufactureDate,
      itemQuantity: safeItemQuantity,
    });

    const savedItem = await newItem.save();
    return res.status(201).json({ success: true, message: "Item added successfully!", data: savedItem });

  } catch (error) {
    console.error("Error adding item:", error);
    return res.status(500).json({ success: false, message: "Could not add item" });
  }
};




// Update Item
export const editItem = async (req, res) => {
  const { id } = req.params;

  try {
    const currentItem = await items.findById(id);
    if (!currentItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // Ensure itemQuantity is non-negative
    if (req.body.itemQuantity !== undefined) {
      req.body.itemQuantity = Math.max(0, req.body.itemQuantity);
    }

    const updatedItem = await items.findByIdAndUpdate(id, { $set: req.body }, { new: true });

    return res.status(200).json({ success: true, message: "Item updated successfully!", data: updatedItem });

  } catch (error) {
    console.error("Error updating item:", error);
    return res.status(500).json({ success: false, message: "Failed to update item" });
  }
};




// Delete Item
export const deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedItem = await items.findByIdAndDelete(id);
    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    return res.status(200).json({ success: true, message: "Item deleted successfully!" });

  } catch (error) {
    console.error("Error deleting item:", error);
    return res.status(500).json({ success: false, message: "Failed to delete item" });
  }
};



// Get All Items with Search & Pagination
export const getAllItems = async (req, res) => {
  const page = parseInt(req.query.page, 5) || 1;
  const itemsPerPage = parseInt(req.query.limit, 5) || 5;
  const searchQuery = req.query.search || ""; // Search text

  try {
    // Search filter (by name or qrCode, case insensitive)
    const searchFilter = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { qrCode: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // Get total count of filtered items
    const totalItemCount = await items.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalItemCount / itemsPerPage);

    // Get paginated & filtered items
    const getItems = await items
      .find(searchFilter)
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    return res.status(200).json({
      success: true,
      count: getItems.length,
      totalItems: totalItemCount,
      data: getItems.map(item => ({
        ...item._doc,
        itemQuantity: Math.max(0, item.itemQuantity), // Ensure non-negative quantity
      })),
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ success: false, message: "Couldn't fetch items" });
  }
};
