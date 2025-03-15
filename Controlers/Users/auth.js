import users from "../../Models/Users/users.js";
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";

// Register User
export const register = async (req, res) => {
    try {
        const {
            firstName,
            secondName,
            lastName,
            userName,
            dateOfBirth,
            gender,
            contacts,
            address,
            title,
            email,
            password,
            roles
        } = req.body;

        console.log("Received Request:", req.body);
        console.log("Received File:", req.file);

        // Check if user already exists
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log("Hashed Password:", hashedPassword); // Debugging

        // Parse roles (since it's sent as a JSON string)
        const rolesData = JSON.parse(roles);

        // Create new user
        const newUser = await users.create({
            firstName,
            secondName,
            lastName,
            userName,
            dateOfBirth,
            gender,
            contacts,
            address,
            title,
            email,
            password: hashedPassword,
            photo: req.file ? req.file.filename : null, // Fixed req.file issue
            roles: {
                canAddItems: rolesData?.canAddItems || false,
                canEditItems: rolesData?.canEditItems || false,
                canSeeReports: rolesData?.canSeeReports || false,
                canAccessSettings: rolesData?.canAccessSettings || false,
            },
        });

        return res.status(201).json({ data: newUser, message: "User created successfully!" });
    } catch (error) {
        console.error("Error Registering User:", error);
        return res.status(500).json({ error: error.message });
    }
};




// Login User
export const login = async (req, res) => {
    try {
        const { userName, password } = req.body;

        // Find user
        const existingUser = await users.findOne({ userName });
        if (!existingUser) {
            return res.status(400).json({ error: "User does not exist." });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, existingUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid password." });
        }

        // Generate token
        const token = jwt.sign({ id: existingUser._id }, process.env.MYCODE, { expiresIn: "30m" });

        // Set cookie
        res.cookie("accessToken", token, {
            maxAge: 1000 * 60 * 30, // 30 minutes
            httpOnly: true,
            sameSite: "none",
            secure: true,
        });

        const { password: _, ...userData } = existingUser._doc;
        res.status(200).json(userData);
    } catch (error) {
        console.error("Error Logging In:", error);
        res.status(500).json({ error: "Internal server error." });
    }
};




// Logout User
export const logout = async (req, res) => {
    try {
        res.cookie("accessToken", null, {
            httpOnly: true,
            expires: new Date(Date.now() + 60000),
        });

        res.status(200).json({ message: "Logged out successfully." });
    } catch (error) {
        res.status(500).json({ error: "Internal server error." });
    }
};
