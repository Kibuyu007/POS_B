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

      // Determine item status
      const currentDate = new Date();
      const status = new Date(expireDate) < currentDate ? "Expired" : "Active";

    const newItem = new items({
      name,
      price,
      category,
      qrCode,
      expireDate,
      manufactureDate,
      itemQuantity: safeItemQuantity,
      status,
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

       // If expireDate is being updated, recalculate status
       if (req.body.expireDate) {
        const currentDate = new Date();
        req.body.status = new Date(req.body.expireDate) < currentDate ? "Expired" : "Active";
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






// Get All Items with Search, Category Filter & Pagination
export const getAllItems = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const itemsPerPage = parseInt(req.query.limit, 10) || 10;
  const searchQuery = req.query.search || ""; // Search text
  const categoryFilter = req.query.category || ""; // Category filter

  try {
    // Build the search filter
    const searchFilter = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { qrCode: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // If a category filter is provided, add it to the searchFilter
    if (categoryFilter) {
      searchFilter.category = categoryFilter; // Assuming "category" is a field in your item model
    }

    // Get the total number of items matching the filter
    const totalItemCount = await items.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalItemCount / itemsPerPage);

    // Fetch items with the search and category filters
    const getItems = await items
      .find(searchFilter)
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    const currentDate = new Date();

    // Update statuses before sending response
    const updatedItems = await Promise.all(
      getItems.map(async (item) => {
        const status = new Date(item.expireDate) < currentDate ? "Expired" : "Active";

        // Update only if status has changed
        if (item.status !== status) {
          await items.findByIdAndUpdate(item._id, { status });
        }

        return {
          ...item._doc,
          itemQuantity: Math.max(0, item.itemQuantity),
          status, // Ensure status is updated in response
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: updatedItems.length,
      totalItems: totalItemCount,
      data: updatedItems,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    return res.status(500).json({ success: false, message: "Couldn't fetch items" });
  }
};



export const searchItem = async (req, res) => {

  const query = req.query.query;

  try {
    const allItems = await items.find({
      name: { $regex: query, $options: "i"},
    });

    res.status(200).json({data: allItems});  
  } catch (error) {
    res.status(500).json({ message: "Error fetching items" });
    console.error("Error fetching items:", error);
  }
}
