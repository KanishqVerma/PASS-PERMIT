const mongoose = require("mongoose");

const hrSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    companyID: {
      type: String,
      required: true,
    },
    department: {
      type: String,
    },
  },
  { timestamps: true }
);
module.exports = mongoose.model("hr", hrSchema);
