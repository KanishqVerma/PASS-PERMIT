const express = require("express");
const app = express();
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const signupModel = require("./models/signup");
const userModel = require("./models/user");
const hrModel = require("./models/hr");
const dotenv = require("dotenv");
const { fillSchema } = require("./schema.js");
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

const validateFill = (req, res, next) => {
  console.log(fillSchema.describe());
  console.log(req.body);
  let { error } = fillSchema.validate(req.body);

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(404, errMsg);
  } else {
    next();
  }
};

app.get("/home", (req, res) => {
  res.render("layouts/boilerplate.ejs", { page: "home" });
});

app.get("/login", (req, res) => {
  res.render("users/login.ejs", { page: "login" });
});

app.get("/signup", (req, res) => {
  res.render("users/signup.ejs", { page: "signup" });
});

app.get("/about", (req, res) => {
  res.render("includes/about.ejs", { page: "about" });
});

app.get("/process", (req, res) => {
  res.render("includes/process.ejs", { page: "process" });
});

app.get("/contact", (req, res) => {
  res.render("includes/contact.ejs", { page: "contact" });
});

app.get("/hrfind", (req, res) => {
  res.render("includes/hr_find_user.ejs", { page: "hrfind" });
});

app.get("/hraprooval", (req, res) => {
  res.render("includes/hr_aproove.ejs", { page: "hraprooval" });
});

app.post("/login", async (req, res) => {
  try {
    let { email, password, enrollmentOrCompanyId } = req.body;
    // 1 ) check if it is user or hr
    let hr = await hrModel.findOne({ email: email });
    if (hr) {
      if (hr.password !== password || hr.companyID !== enrollmentOrCompanyId) {
        return res.send("Invalid credentials");
      }
      res.render("includes/hr_dashboard.ejs", { page: "hrDash" });
    }

    // 2. If not HR, check in User collection
    let existingUser = await signupModel.findOne({ email: email });

    // check password (plain comparison for now, later use bcrypt)
    if (existingUser) {
      if (existingUser.Password !== password || existingUser.enrollmentOrCompanyId !== enrollmentOrCompanyId) {
        return res.send("Invalid credentials");
      }

      // if user exists and password is correct → check if pass is already filled
      let userDetails = await userModel.findOne({ enrollmentOrCompanyId: existingUser.enrollmentOrCompanyId });

      if (userDetails) {
        // already filled → go directly to dashboard
        console.log(" Existing user login → Dashboard");
        return res.render("includes/user_dashboard.ejs", { page: "userDash", user: userDetails });
      } else {
        // signed up but pass not filled yet → ask to fill pass
        console.log("User login but no pass → redirect to fill pass");
        return res.render("includes/fill-pass.ejs", { page: "fill", user: existingUser });
      }
    }
    // 3. If not in either
    return res.status(400).send("Email not registered");
  } catch (err) {
    console.error(err);
  }
});

// NOW WHEN WE COME TO hr_find , i want to find user

app.post("/hrfind", async (req, res) => {
  let { visitorName, EnrollmentOrCompanyId, aadhaarLast4 } = req.body;
  let visitor = await userModel.findOne({ adhaarLast4: aadhaarLast4 });
  if (visitor) {
    if (visitor.name !== visitorName || visitor.enrollmentOrCompanyId !== EnrollmentOrCompanyId) {
      return res.send("User doesnt exist");
    }
    res.render("includes/hr_aproove.ejs", { page: "hraprooval", visitor: visitor });
  }
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

app.post("/userDash", upload.single("idPic"), validateFill, async (req, res) => {
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
