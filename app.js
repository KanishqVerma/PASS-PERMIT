const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");




app.get("/home", (req, res) => {
  res.render( "layouts/boilerplate.ejs", { page: "home" });
});

app.get("/login", (req, res) => {
  res.render("users/login.ejs",{ page: "login" });
});

app.get("/signup", (req, res) => {
  res.render("users/signup.ejs",{ page: "signup" }); 
});


// app.get("/",(req,res)=>{
//     res.render("layouts/boilerplate.ejs");
// })


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.get("/login", (req, res) => {
  res.render("users/login.ejs");
});

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});
