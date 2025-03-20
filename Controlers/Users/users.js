import users from "../../Models/Users/users.js";
import logs from "../../Models/Users/logs.js";
import bcrypt from "bcrypt";

export const updateUser = async (req, res) => {
  const id = req.params.id;

  try {
    const userUp = await users.findById(id);
    if (!userUp) {
      return res.status(404).json("User not found.");
    }

    // Check if the authenticated user has permission
    // if (req.userId !== userUp._id.toString()) {
    //   return res.status(401).json("You are not authorized to update this user.");
    // }

    // Hash password if it's provided
    if (req.body.password) {
      if (req.body.password.length < 4) {
        return res
          .status(400)
          .json({ error: "Password must be at least 4 characters long." });
      }
      req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    // Extract roles from request body
    const rolesData = req.body.roles || {};

    // Update user fields
    const updateUser = await users.findByIdAndUpdate(
      id,
      {
        $set: {
          firstName: req.body.firstName,
          secondName: req.body.secondName,
          lastName: req.body.lastName,
          userName: req.body.userName,
          dateOfBirth: req.body.dateOfBirth,
          gender: req.body.gender,
          contacts: req.body.contacts,
          address: req.body.address,
          title: req.body.title,
          email: req.body.email,
          password: req.body.password, // Use the hashed password if provided
          photo: req.file ? req.file.filename : userUp.photo, // Keep existing photo if no new one is uploaded
          roles: {
            canAddItems: rolesData.canAddItems || false,
            canEditItems: rolesData.canEditItems || false,
            canSeeReports: rolesData.canSeeReports || false,
            canAccessSettings: rolesData.canAccessSettings || false,
          },
          status: "Active",
        },
      },
      { new: true }
    );

    if (!updateUser) {
      return res.status(404).json({ error: "User update failed." });
    }

    const { password, ...userData } = updateUser._doc;

    //Logs of update action
    await logs.create({
      userId: id,
      action: "User Updated Profile",
      details: `User ${updateUser.firstName} ${updateUser.lastName} updated profile.`,
    });

    return res.status(200).send(userData);
  } catch (error) {
    console.error("Error updating user:", error);
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
      return res
        .status(401)
        .json("You are not authorized to delete this user.");
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
    return res
      .status(500)
      .json({ error: "An error occurred while fetching users." });
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
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the user." });
  }
};

//Change User Status
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

    //Logsof status change
    await logs.create({
      userId: id,
      action: "User Status Changed",
      details: `User ${user.firstName} ${user.lastName} changed status to ${user.status}.`,
    });

    res
      .status(200)
      .json({
        message: `User ${user.status} successfully`,
        status: user.status,
      });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
