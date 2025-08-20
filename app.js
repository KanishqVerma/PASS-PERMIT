const express = require("express");
const app = express();
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const signupModel = require("./models/signup");
const userModel = require("./models/user");
const dotenv = require("dotenv");
const {fillSchema}=require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");

dotenv.config();
app.use(express.urlencoded({ extended: true }));
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((err) => {
    console.log("Error connecting mongodb", err);
  });

// Configure storage (files saved in 'uploads/' folder)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const validateFill=(req,res,next)=>{
  console.log(fillSchema.describe());
console.log(req.body);
  let {error}=fillSchema.validate(req.body);
  
  if(error){
    let errMsg=error.details.map((el)=>el.message).join(",");
    throw new ExpressError(404,errMsg);
  }else{
    next();
  }
}

app.get("/home", (req, res) => {
  res.render("layouts/boilerplate.ejs", { page: "home" });
});

app.get("/login", (req, res) => {
  res.render("users/login.ejs", { page: "login" });
});

app.get("/signup", (req, res) => {
  res.render("users/signup.ejs", { page: "signup" });
});


app.get("/hrDash", (req, res) => {
  res.render("includes/hr_dashboard.ejs", { page: "hrDash" });
});

app.get("/hrfind", (req, res) => {
  res.render("includes/hr_find_user.ejs", { page: "hrfind" });
});

app.get("/hraprooval", (req, res) => {
  res.render("includes/hr_aproove.ejs", { page: "hraprooval" });
});

app.post("/fill", async (req, res) => {
  let { email, compID, password } = req.body;
  // check if user already exists
  let existingUser = await signupModel.findOne({ email: email });
  if (existingUser) {
    console.log("User already exists");
    res.send("This email already exists. Please login.");
  }
  // else create new user
  let createdsignup = await signupModel.create({
    email: email,
    enrollmentOrCompanyId: compID,
    Password: password,
  });
  console.log("✅User saved");
  res.render("includes/fill-pass.ejs", { page: "fill" });
});

app.post("/userDash",upload.single("idPic"),validateFill, async (req, res) => {
  let { name, purpose, adhaar, phone, compID, compName, vehicleType, vehicleNumber } = req.body;

  let createdUser = await userModel.create({
    name,
    purpose,
    adhaarLast4: adhaar,
    idCardPic: req.file.filename,
    phone,
    enrollmentOrCompanyId: compID,
    collegeOrCompanyName: compName,
    vehicleType,
    vehicleNumber,
  });
  console.log("User added");
  res.render("includes/user_dashboard.ejs", { page: "userDash", user: createdUser });
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
