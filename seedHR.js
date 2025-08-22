const mongoose = require("mongoose");
const dotenv = require("dotenv");
const HR = require("./models/hr");

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("seedHR file : MongoDB Connected"))
  .catch((err) => console.log(err));

async function seedHR() {
  try {
    const hrData = [
      {
        email: "hr1@gmail.com",
        password: "hrpassword1",
        name: "HR One",
        companyID: "aai100",
        department: "IT dept",
      },
      {
        email: "hr2@gmail.com",
        password: "hrpassword2",
        name: "HR Two",
        companyID: "aai101",
        department: "Finance",
      },
    ];

    await HR.insertMany(hrData);
    console.log("✅ HR data inserted successfully");
    mongoose.connection.close();
  } catch (error) {
    console.log("❌ Error inserting HR data:", error);
  }
}

seedHR();
