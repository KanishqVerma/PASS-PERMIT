const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    purpose: {
      type: String,
      enum: ["Internship", "Job Interview", "Meeting", "Client Visit", "Training", "Other"], //  options
      required: true,
    },

    adhaarLast4: {
      type: String,
      required: true,
      match: /^[0-9]{4}$/, // exactly 4 digits
    },

    idCardPic: {
      type: String, // store image URL or file path
      required: true,
    },

    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/, // 10 digit phone number
    },

    enrollmentOrCompanyId: {
      type: String,
      required: true,
    },

    collegeOrCompanyName: {
      type: String,
      required: true,
    },

    vehicleType: {
      type: String,
      enum: ["Car", "Bike", "Scooter", "Cycle", "Other"],
      required: false,
    },

    vehicleNumber: {
      type: String,
      required: function () {
        return this.vehicleType != null && this.vehicleType.trim() !== "";
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
