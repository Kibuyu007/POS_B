import users from "../../Models/Users/users.js";
import bcrypt from 'bcrypt';

// Update User
export const updateUser = async (req, res) => {
  const id = req.params.id;
  try {
    const userUp = await users.findById(id);
    
    if (!userUp) {
      return res.status(404).json("User not found.");
    }
    
    if (req.userId !== userUp._id.toString()) {
      return res.status(401).json("You are not authorized to update this user.");
    }
    
    if (req.body.password) {
      if (req.body.password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters long." });
      }
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }
    
    const updateUser = await users.findByIdAndUpdate(
      id,
      { $set: {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        photo: req.body.photo,
      }},
      { new: true }
    );
    
    const { password, ...ficha } = updateUser._doc;
    
    return res.status(200).send(ficha);
    
  } catch (error) {
    res.status(500).json({ error: "An error occurred." });
  }
};



// Delete User
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await users.findById(id);
    
    if (!user) {
      return res.status(404).json("User not found.");
    }
    
    if (req.userId !== user._id.toString()) {
      return res.status(401).json("You are not authorized to delete this user.");
    }
    
    await Users.findByIdAndDelete(id);
    return res.status(200).json("User deleted.");
    
  } catch (error) {
    return res.status(500).json({ error: "An error occurred." });
  }
};



// Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await users.find();
    return res.status(200).json(allUsers);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching users." });
  }
};



// Get User by ID
export const getUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await users.findById(id);
    
    if (!user) {
      return res.status(404).json("User not found.");
    }
    
    const { password, ...userDetails } = user._doc;
    return res.status(200).json(userDetails);
    
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching the user." });
  }
};


export const userStatus = async (req, res) => {
  try {
      const { id } = req.params;
      const user = await users.findById(id);

      if (!user) {
          return res.status(404).json({ error: "User not found." });
      }

      // Toggle between Active and Inactive
      user.status = user.status === "Active" ? "Inactive" : "Active";
      await user.save();

      res.status(200).json({ message: `User ${user.status} successfully`, status: user.status });
  } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: "Internal server error." });
  }
};


