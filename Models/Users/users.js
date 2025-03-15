import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    secondName: {
      type: String,
      required: false, // Optional field
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
        required: false
    },
    
    roles: {
      canAddItems: { type: Boolean, default: false },
      canEditItems: { type: Boolean, default: false },
      canSeeReports: { type: Boolean, default: false },
      canAccessSettings: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Users", userSchema);
