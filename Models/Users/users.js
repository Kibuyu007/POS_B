import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    secondName: {
      type: String,
      required: true, // Optional field
    },
    lastName: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"], // Optional: Restrict values
    },
    contacts: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /\S+@\S+\.\S+/.test(v);
        },
        message: "Invalid Email format",
      },
    },
    password: {
      type: String,
      required: true,
    },

    photo: {
        type: String,
        required: true
    },
    
    roles: {
      canAddItems: { type: Boolean, default: true },
      canEditItems: { type: Boolean, default: true },
      canSeeReports: { type: Boolean, default: true },
      canAccessSettings: { type: Boolean, default: true },
      canMakeTransaction:{type: Boolean, default: true},
      canAccessUserManagement: {type: Boolean, default: true},
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

export default mongoose.model("Users", userSchema);
