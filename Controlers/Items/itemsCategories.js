import categories from "../../Models/Items/itemsCategories.js";
import items from "../../Models/Items/items.js";




// Add New ItemCategory
export const addNewItemCategories = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if category already exists
    const existingCategory = await categories.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const newItem = new categories({ name, description });

    const savedItem = await newItem.save();
    return res.status(201).json({ success: true, message: "Category added successfully!", data: savedItem });


  } catch (error) {
    console.error("Error adding category:", error);
    return res.status(500).json({ success: false, message: "Could not add category" });
  }
};



// Update ItemCategory
export const editItemCategories = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedCategory = await categories.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully!",
      data: updatedCategory,
    });

  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ success: false, message: "Failed to update category" });
  }
};




// Delete ItemCategory
export const deleteItemCategories = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCategory = await categories.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, message: "Category deleted successfully!" });

  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ success: false, message: "Failed to delete category" });
  }
};





// Get All ItemCategories with Optional Search & Pagination
export const getAllItemCategories = async (req, res) => {
  const page = req.query.page ? parseInt(req.query.page, 10) : null;
  const itemsPerPage = req.query.limit ? parseInt(req.query.limit, 7) : null;
  const searchQuery = req.query.search || ""; // Search text

  try {
    // Search filter (by name or description, case insensitive)
    const searchFilter = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // If pagination is provided, apply it; otherwise, return all categories
    let getCategories;
    if (page && itemsPerPage) {
      getCategories = await categories
        .find(searchFilter)
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage);
    } else {
      getCategories = await categories.find(searchFilter); // Get all categories
    }

       // Add item count for each category
       const categoriesWithItemCount = await Promise.all(
        getCategories.map(async (category) => {
          const itemCount = await items.countDocuments({ category: category._id });
          return { ...category.toObject(), itemCount };
        })
      );

    const totalItemCount = await categories.countDocuments(searchFilter);
    const totalPages = itemsPerPage ? Math.ceil(totalItemCount / itemsPerPage) : 1;

    return res.status(200).json({
      success: true,
      count: categoriesWithItemCount.length,
      totalItems: totalItemCount,
      data: getCategories,
      currentPage: page || 1,
      totalPages,
    });

  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ success: false, message: "Couldn't fetch categories" });
  }
};

