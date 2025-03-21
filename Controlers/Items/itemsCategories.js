import categories from "../../Models/Items/itemsCategories.js";




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





// Get All ItemCategories with Search & Pagination
export const getAllItemCategories = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const itemsPerPage = parseInt(req.query.limit, 10) || 20;
  const searchQuery = req.query.search || ""; // Search text

  try {
    // Search filter (by name or description, case insensitive)
    const searchFilter = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // Get total count of filtered categories
    const totalItemCount = await categories.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalItemCount / itemsPerPage);

    // Get paginated & filtered categories
    const getCategories = await categories
      .find(searchFilter)
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    return res.status(200).json({
      success: true,
      count: getCategories.length,
      totalItems: totalItemCount,
      data: getCategories,
      currentPage: page,
      totalPages,
    });

  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ success: false, message: "Couldn't fetch categories" });
  }
};
