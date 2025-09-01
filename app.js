// ===== Required Modules =====
const express = require("express");
const app = express();
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");
const dotenv = require("dotenv");
const streamifier = require("streamifier");

const signupModel = require("./models/signup");
const userModel = require("./models/user");
const hrModel = require("./models/hr");
const passModel = require("./models/pass");
const { fillSchema } = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
const { generatePass } = require("./pdf/generate_pass_final.js");
const { v2: cloudinary } = require("cloudinary");
const hr = require("./models/hr");

dotenv.config();

// ===== Cloudinary Configuration =====
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

// ===== Express & Mongo =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb connected"))
  .catch((err) => console.log("Error connecting mongodb", err));

// ===== Multer Memory Storage =====
const upload = multer({ storage: multer.memoryStorage() });

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

const sessionOptions = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Local Strategy
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      // Check if user exists in Signup
      let user = await signupModel.findOne({ email });
      if (user) {
        const validUser = await user.authenticate(password);
        if (validUser.user) {
          return done(null, { userid: user._id, role: user.role });
        }
        return done(null, false, { message: "Invalid credentials" });
      }

      // Otherwise check in HR
      let hr = await hrModel.findOne({ email });
      if (hr) {
        if (hr.password === password) {
          // ⚠ Later replace with bcrypt
          return done(null, { hrid: hr._id, role: hr.role });
        }
        return done(null, false, { message: "Invalid credentials" });
      }

      return done(null, false, { message: "No account found with that email" });
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => done(null, user));

passport.deserializeUser(async (obj, done) => {
  try {
    if (obj.role === "user") {
      const user = await signupModel.findById(obj.userid); // match property name
      return done(null, user);
    } else if (obj.role === "hr") {
      const hr = await hrModel.findById(obj.hrid); // match property name
      return done(null, hr);
    }
    done(null, false);
  } catch (err) {
    done(err);
  }
});

// Make user available in all templates
app.use(async (req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;

  // Default
  res.locals.latestPass = null;

  // If logged in and user, fetch latest pass
  if (req.user && req.user.role === "user") {
    try {
      const latest = await passModel.findOne({ userId: req.user._id, status: "Active" }).sort({ validFrom: -1 });
      res.locals.latestPass = latest;
    } catch (err) {
      console.error("Error fetching latestPass:", err);
    }
  }

  next();
});

// function isLoggedIn(req, res, next) {
//   if (req.isAuthenticated()) return next();
//   req.flash("error", "You must be logged in first!");
//   res.redirect("/login");
// }

function isHR(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "hr") {
    return next();
  }
  req.flash("error", "Access denied!");
  res.redirect("/login");
}

// ✅ Middleware to check User role
function isUser(req, res, next) {
  if (req.isAuthenticated() && req.user.role === "user") {
    return next();
  }
  req.flash("error", "Access denied!");
  res.redirect("/login");
}

// app.get("/hr/dashboard/", isHR, (req, res) => {
//    res.render("includes/hr_dashboard.ejs", { page: "hrDash", currUser: req.user
//   });
// });

// app.get("/fill-pass", isUser, (req, res) => {
//    res.render("includes/fill-pass.ejs", { page: "fill",
//     currUser: req.user
//   });
// });

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

app.get("/hr/dashboard/:id", isHR, async (req, res) => {
  let hr_id = req.params.id;
  let { id } = req.params;
  const queryHrId = new mongoose.Types.ObjectId(hr_id);
  console.log("HR ID from params:", id);

  // let hr = await hrModel.findById();

  // fetch all passes for this HR
  let passes = await passModel.find({ hrId: queryHrId }).populate("userId", "name");

  const totalPasses = await passModel.countDocuments({ hrId: queryHrId });
  const activePasses = await passModel.countDocuments({ hrId: queryHrId, status: "Active" });
  const expiredPasses = await passModel.countDocuments({ hrId: queryHrId, status: "Expired" });

  res.render("includes/hr_dashboard.ejs", { page: "hrDash", totalPasses, activePasses, expiredPasses, passes, id });
});

app.post("/hrfind", async (req, res) => {
  let { visitorName, EnrollmentOrCompanyId, aadhaarLast4 } = req.body;
  let visitor = await userModel.findOne({ name: visitorName, adhaarLast4: aadhaarLast4, enrollmentOrCompanyId: EnrollmentOrCompanyId });
  if (!visitor) {
    return res.send("User doesnt exist");
  }
  if (visitor.name !== visitorName || visitor.enrollmentOrCompanyId !== EnrollmentOrCompanyId) {
    return res.send("User details do not match");
  }
  res.render("includes/hr_aproove.ejs", { page: "hraprooval", visitor: visitor });
});

app.post("/fill", async (req, res) => {
  // this fxn is not bieng used rn
  //
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
  // return res.redirect(`/dashboard/${userDetails._id}`);
});

app.post("/signup", async (req, res) => {
  try {
    let { email, compID, password } = req.body;
    let newUser = new signupModel({
      username: email,
      email: email,
      // enrollmentOrCompanyId: compID,
      role: "user",
    });
    const registerUser = await signupModel.register(newUser, password);
    console.log(registerUser);
    req.flash("success", "Welcome to the Pass Management System");
    res.redirect(`/fill/${newUser._id}`);
  } catch (err) {
    {
      req.flash("error", err.message);
      res.redirect("/signup");
    }
  }
});

app.post("/login", passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }), (req, res) => {
  console.log("After login, req.user:", req.user); // ✅ should print once

  if (req.user.role === "hr") {
    return res.redirect(`/hr/dashboard/${req.user.hrid}`);
  } else if (req.user.role === "user") {
    console.log(req.user.userid);
    return res.redirect(`/dashboard/${req.user.userid}`);
  } else {
    req.flash("error", "Invalid role!");
    return res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Logged out successfully");
    console.log(req.user);
    res.redirect("/home");
  });
});

app.get("/fill/:id", (req, res) => {
  const userId = req.params.id; // get id from URL

  res.render("includes/fill-pass", { page: "fill", userId });
});

// ===== Fill Pass POST with Cloudinary =====
app.post("/fill-pass/:id", upload.single("idPic"), validateFill, async (req, res) => {
  const userId = req.params.id;

  if (!req.file) {
    req.flash("error", "Please upload your ID card picture");
    return res.redirect(`/fill/${userId}`);
  }

  const uploadStream = cloudinary.uploader.upload_stream({ folder: "pass_permit_id_cards" }, async (err, result) => {
    if (err) {
      console.error(err);
      req.flash("error", "Error uploading to Cloudinary");
      return res.redirect(`/fill/${userId}`);
    }

    const { name, purpose, adhaar, phone, compID, compName, vehicleType, vehicleNumber } = req.body;

    const createdUser = await userModel.create({
      _id: userId,
      name,
      purpose,
      adhaarLast4: adhaar,
      idCardPic: result.secure_url,
      phone,
      enrollmentOrCompanyId: compID,
      collegeOrCompanyName: compName,
      vehicleType,
      vehicleNumber,
    });

    res.redirect(`/dashboard/${createdUser._id}`);
  });

  streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
});

// // ===== User Dashboard =====
// app.get("/dashboard/:id", async (req, res) => {
//   const user_Id = req.params.id; // string url

//   const queryUserId = new mongoose.Types.ObjectId(user_Id);

//   // fetch user details
//   const userDetails = await userModel.findById(queryUserId);

//   const totalPasses = await passModel.countDocuments({ userId: queryUserId });
//   const activePasses = await passModel.countDocuments({ userId: queryUserId, status: "Active" });
//   const expiredPasses = await passModel.countDocuments({ userId: queryUserId, status: "Expired" });

//   const passes = await passModel.find({ userId: queryUserId });
//   return res.render("includes/user_dashboard.ejs", { page: "userDash", user: userDetails, totalPasses, activePasses, expiredPasses, passes });
// });

// ===== User Dashboard =====

app.get("/dashboard/:id", async (req, res) => {
  const user_Id = req.params.id;
  const queryUserId = new mongoose.Types.ObjectId(user_Id);

  // fetch user details
  const userDetails = await userModel.findById(queryUserId);

  const totalPasses = await passModel.countDocuments({ userId: queryUserId });
  const activePasses = await passModel.countDocuments({ userId: queryUserId, status: "Active" });
  const expiredPasses = await passModel.countDocuments({ userId: queryUserId, status: "Expired" });

  // ✅ get latest active pass (for navbar button)
  const latestPass = await passModel.findOne({ userId: queryUserId, status: "Active" }).sort({ validFrom: -1 });

  const passes = await passModel.find({ userId: queryUserId });

  return res.render("includes/user_dashboard.ejs", {
    page: "userDash",
    user: userDetails,
    currUser: userDetails,
    totalPasses,
    activePasses,
    expiredPasses,
    passes,
    latestPass,
  });
});

// ===== Download Pass by ID =====
app.get("/pass/:id/download", async (req, res) => {
  try {
    const pass = await passModel.findById(req.params.id);
    if (!pass) {
      return res.status(404).send("Pass not found");
    }

    // force download using fl_attachment
    let pdfUrl = pass.pdfUrl;
    if (pdfUrl.includes("/upload/")) {
      pdfUrl = pdfUrl.replace("/upload/", "/upload/fl_attachment/");
    }

    res.redirect(pdfUrl);
  } catch (err) {
    console.error("Error downloading pass:", err);
    res.status(500).send("Something went wrong");
  }
});

app.post("/userDash", upload.single("idPic"), validateFill, async (req, res) => {
  // this fxn is not bieng used rn
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

app.post("/download-pass", async (req, res) => {
  try {
    // try
    const hr = req.user; // full HR document from session
    const hrid = hr._id;

    // const hrid = req.user._id;
    console.log("HR ID issuing the pass:", hrid);
    const { userId, validFrom, validUpto } = req.body;

    // basic validations
    if (!userId || !validFrom || !validUpto) {
      return res.status(400).send("userId, validFrom, validUpto are required");
    }

    const user = await userModel.findById(userId).lean();
    if (!user) return res.status(404).send("User not found");

    // parse dates
    const issueDate = new Date(`${validFrom}T00:00:00`);
    const expiryDate = new Date(`${validUpto}T23:59:59`);
    if (isNaN(issueDate) || isNaN(expiryDate)) {
      return res.status(400).send("Invalid dates");
    }
    if (expiryDate < issueDate) {
      return res.status(400).send("Valid Upto must be after Valid From");
    }

    const formatDate = (date) => `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;

    const diffDays = Math.ceil((expiryDate - issueDate) / (1000 * 60 * 60 * 24));

    // build data for PDF
    const passData = {
      department: hr.department,
      issueDate: formatDate(issueDate),
      expiryDate: formatDate(expiryDate),
      validity: `${diffDays} Days`,
      visitors: [
        {
          s_no: 1,
          name: user.name,
          govt_id: user.adhaarLast4,
          company: user.collegeOrCompanyName || "N/A",
          vehicleType: user.vehicleType,
          vehicleNumber: user.vehicleNumber,
        },
      ],
    };

    const pdfBuffer = await generatePass(passData);

    // Upload PDF to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "pass_permit_pdf", resource_type: "raw" }, // resource_type raw for PDFs
      (err, result) => {
        if (err) {
          console.error("Cloudinary upload error:", err);
        } else {
          console.log("PDF uploaded to Cloudinary:", result.secure_url);
          // You can store result.secure_url in your DB if needed
          // Save the approved pass in the model

          const newPass = new passModel({
            userId,
            department: hr.department,
            hrId: hrid, // have to work on it / may come from sessions
            issuedBy: hr.name,
            validFrom,
            validUpto,
            status: "Active",
            pdfUrl: result.secure_url,
          });
          newPass.save();
          console.log("Pass record created:", newPass);
          return res.redirect(`/hr/dashboard/${hr._id}`);
        }
      }
    );

    // Pipe PDF buffer to Cloudinary
    streamifier.createReadStream(pdfBuffer).pipe(uploadStream);
  } catch (error) {
    console.error("Error downloading pass:", error);
    res.status(500).send("Error generating pass");
  }
});

// trial 27aug

app.get("/api/pass/download-pass/:userId", async (req, res) => {
  const { userId } = req.params;

  // find the approved pass of this user
  const pass = await passModel.findOne({ userId, status: "approved" }).populate("userId");

  if (!pass) return res.status(404).send("No approved pass found");

  // generate PDF and send
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=pass_${userId}.pdf`);

  // your pdf creation logic here...
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
