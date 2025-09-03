const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");

const hrSchema = new Schema(
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
    role:{
      type: String,
      default: "hr",
    }
  },
  { timestamps: true }
);

hrSchema.plugin(passportLocalMongoose); // adds username, hash and salt fields
module.exports = mongoose.model("hr", hrSchema);
