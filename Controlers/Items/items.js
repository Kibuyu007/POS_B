import mongoose from "mongoose";
import items from "../../Models/Items/items.js";
import { v4 as uuidv4 } from "uuid";

// Generate numeric barcode (you can make it fixed length, e.g. 12 digits)
const generateBarcode = () => {
  return Math.floor(1000000 + Math.random() * 90000000).toString();
};

// Add New Item
export const addNewItem = async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      expireDate,
      manufactureDate,
      itemQuantity,
      reOrder,
      discount,
    } = req.body;

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });
    }

    // Ensure itemQuantity is non-negative
    const safeItemQuantity = Math.max(0, itemQuantity || 0);

      // Ensure Discount is non-negative
    const safeDiscount = Math.max(0, discount || 0);

    // Determine item status
    const currentDate = new Date();
    const status = new Date(expireDate) < currentDate ? "Expired" : "Active";

    // Generate barcode automatically
    let barCode;
    let exists = true;
    while (exists) {
      barCode = generateBarcode();
      exists = await items.findOne({ barCode });
    }

    const newItem = new items({
      name,
      price,
      category,
      barCode,
      expireDate,
      manufactureDate,
      itemQuantity: safeItemQuantity,
      reOrder,
      discount: safeDiscount,
      status,
      reOrderStatus: safeItemQuantity <= reOrder ? "Low" : "Normal",
      createdBy: req.userId,
    });

    const savedItem = await newItem.save();
    return res
      .status(201)
      .json({
        success: true,
        message: "Item added successfully!",
        data: savedItem,
      });
  } catch (error) {
    console.error("Error adding item:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not add item" });
  }
};

// Update Item
export const editItem = async (req, res) => {
  const { id } = req.params;

  try {
    const currentItem = await items.findById(id);
    if (!currentItem) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // Ensure itemQuantity is non-negative
    if (req.body.itemQuantity !== undefined) {
      req.body.itemQuantity = Math.max(0, req.body.itemQuantity);
    }

    // If expireDate is being updated, recalculate status
    if (req.body.expireDate) {
      const currentDate = new Date();
      req.body.status =
        new Date(req.body.expireDate) < currentDate ? "Expired" : "Active";
    }

    // Recalculate reOrderStatus if quantity or reOrder level is being changed
    if (req.body.itemQuantity !== undefined || req.body.reOrder !== undefined) {
      const itemQuantity =
        req.body.itemQuantity !== undefined
          ? req.body.itemQuantity
          : currentItem.itemQuantity;

      const reOrder =
        req.body.reOrder !== undefined ? req.body.reOrder : currentItem.reOrder;

      req.body.reOrderStatus = itemQuantity <= reOrder ? "Low" : "Normal";
    }

    req.body.lastModifiedBy = req.userId;

    const updatedItem = await items.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Item updated successfully!",
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update item" });
  }
};

// Delete Item
export const deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedItem = await items.findByIdAndDelete(id);
    if (!deletedItem) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Item deleted successfully!" });
  } catch (error) {
    console.error("Error deleting item:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete item" });
  }
};

// Get All Items with Search, Category Filter & Pagination
export const getAllItems = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const itemsPerPage = parseInt(req.query.limit, 10) || 12;
  const searchQuery = req.query.search || "";
  const categoryFilter = req.query.category || "";

  try {
    // Build the search filter
    const searchFilter = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { barCode: { $regex: searchQuery, $options: "i" } },
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
        const status =
          new Date(item.expireDate) < currentDate ? "Expired" : "Active";

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
    return res
      .status(500)
      .json({ success: false, message: "Couldn't fetch items" });
  }
};

// Get All Items Without Search or Pagination
export const getAllItemsRaw = async (req, res) => {
  try {
    const allItems = await items.find({});

    const currentDate = new Date();

    // Update statuses before sending response
    const updatedItems = await Promise.all(
      allItems.map(async (item) => {
        const status =
          new Date(item.expireDate) < currentDate ? "Expired" : "Active";

        // Update only if status has changed
        if (item.status !== status) {
          await items.findByIdAndUpdate(item._id, { status });
        }

        return {
          ...item._doc,
          itemQuantity: Math.max(0, item.itemQuantity),
          status,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: updatedItems.length,
      data: updatedItems,
    });
  } catch (error) {
    console.error("Error fetching all items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all items",
    });
  }
};

export const searchItem = async (req, res) => {
  const query = req.query.query;

  try {
    const allItems = await items.find({
      name: { $regex: query, $options: "i" },
    });

    res.status(200).json({ data: allItems });
  } catch (error) {
    res.status(500).json({ message: "Error fetching items" });
    console.error("Error fetching items:", error);
  }
};

// POS Search (Name or Barcode)
export const searchItemsInPos = async (req, res) => {
  const searchQuery = req.query.search?.trim() || "";
  const categoryFilter = req.query.category || "";

  try {
    let searchFilter = {};

    // if search query provided
    if (searchQuery) {
      // If query looks like a barcode (all digits, length >= 4), search exact barcode
      if (/^\d{4,}$/.test(searchQuery)) {
        searchFilter = { barCode: searchQuery };
      } else {
        // Otherwise search by name (case insensitive)
        searchFilter = { name: { $regex: searchQuery, $options: "i" } };
      }
    }

    // Apply category filter if provided
    if (categoryFilter) {
      searchFilter.category = categoryFilter;
    }

    const results = await items.find(searchFilter);

    const currentDate = new Date();
    const updatedItems = await Promise.all(
      results.map(async (item) => {
        const status =
          new Date(item.expireDate) < currentDate ? "Expired" : "Active";
        if (item.status !== status) {
          await items.findByIdAndUpdate(item._id, { status });
        }

        return {
          ...item._doc,
          itemQuantity: Math.max(0, item.itemQuantity),
          status,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: updatedItems.length,
      data: updatedItems,
    });
  } catch (error) {
    console.error("Error searching items:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};
