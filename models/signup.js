const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");

const signupSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    }
  },
  {timestamps:true},
);


signupSchema.plugin(passportLocalMongoose); // adds username, hash and salt fields

module.exports = mongoose.model("Signup", signupSchema);
