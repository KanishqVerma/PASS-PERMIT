const mongoose=require("mongoose");
const Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");

const signupSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role:{
      type: String,
      enum: ["user", "hr"],
      default: "user"
    },
  },
  {timestamps:true},
);


signupSchema.plugin(passportLocalMongoose,{ usernameField: "email" }); // adds username, hash and salt fields

module.exports = mongoose.model("Signup", signupSchema);
