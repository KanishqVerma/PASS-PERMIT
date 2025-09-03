const mongoose = require("mongoose");

const passSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  hrId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "hr",
    required: true,
  },
  issuedBy: {
    type: String,
    required: true,
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now, // will set current date-time if not provided
  },
  validUpto: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["Active", "Expired"],
    default: "Active",
  },
  pdfUrl: {
    type: String,
    required: true,
  },
});
module.exports = mongoose.model("pass", passSchema);
