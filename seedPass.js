const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Pass = require("./models/pass");
const User = require("./models/user");
const Hr = require("./models/hr");
const Signup = require("./models/signup");
dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("seedPass: MongoDB Connected");

    const configs = [
      { enrollmentOrCompanyId: "101", email: "anvi@gmail.com", hrEmail: "hr1@gmail.com" },
      { enrollmentOrCompanyId: "1234567890", email: "weirdkanishq@gmail.com", hrEmail: "hr2@gmail.com" },
      { enrollmentOrCompanyId: "1234567890", email: "weirdkanishq@gmail.com", hrEmail: "hr1@gmail.com" },
    ];

    let passes = [];
    // for loop
    for (const cfg of configs) {
      // find  user to attach passes to
      const user = await User.findOne({ enrollmentOrCompanyId: cfg.enrollmentOrCompanyId });
      const signup = await Signup.findOne({ email: cfg.email });
      const hr = await Hr.findOne({ email: cfg.hrEmail });

      if (!user || !signup || !hr) {
        console.log("user or signup  or hr not found!");
        continue;
      }

      passes.push(
        { userId: user._id, department: "Computer Science", hrId: hr._id, issuedBy: "HR1", validFrom: new Date("2025-09-01"), validUpto: new Date("2025-09-30"), status: "Active" },
        { userId: user._id, department: "Mechanical", hrId: hr._id, issuedBy: "HR1", validFrom: new Date("2025-09-01"), validUpto: new Date("2025-09-30"), status: "Expired" }
      );
    }
    await Pass.insertMany(passes);
    console.log("Dummy passes added!");
    mongoose.connection.close();
  })
  .catch((err) => console.log(err));
