const mongoose = require("mongoose");

const signupSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    enrollmentOrCompanyId: {
      type: String,
      required: true,
    },
    Password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Signup", signupSchema);
