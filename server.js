const express = require("express");
const mongoose = require("mongoose");
const User = require("./modals/User.js");
const bycrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const app = express();
const port = 3000;

mongoose.connect("mongodb://127.0.0.1:27017/userRegister");

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(
  session({
    // name: "user-cookie",
    secret: "secret-key",
    cookie: {
      maxAge: 1000 * 60 * 5, //5 minutes
    },
    saveUninitialized: false,
  })
);

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/views/SignUp/SignUp.html");
});
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/views/Login/Login.html");
});
app.get("/protected", (req, res) => {
  const loggedIn = req.session.loggedIn;
  const visited = req.cookies.visited;
  if (loggedIn) {
    res.sendFile(__dirname + "/views/student.html");
    res.cookie("visited", true);
  } else {
    res.send(
      `<h1 style="text-align:center">Session logged out! Login again</h1>`
    );
  }
});
app.post("/register", async (req, res) => {
  const user = req.body;
  if (!user.password || !user.username) {
    res.send(`<h1>Username & Password are required</h1>`);
  }
  if (user.password.length < 4) {
    res.send(`<h1 style="text-align:center">Password length must be >= 4</h1>`);
  }

  const newUser = new User(user);
  const saltRounds = 10;
  //naveen -----> encrypt ----> shfowewineinfeoiewnfie
  const hashedPwd = await bycrypt.hash(newUser.password, saltRounds);
  newUser.password = hashedPwd;

  try {
    await newUser.save();
    res.sendFile(__dirname + "/views/registerdone.html");
  } catch (err) {
    res.send(`<h1>Couldn't register account</h1>`);
  }
});
app.post("/login", async (req, res) => {
  const loginData = req.body;
  const account = (
    await User.find().where("username").equals(loginData.username)
  )[0];
  if (!account) {
    res.send(`<h1 style="text-align:center">No such account</h1>`);
    return;
  }
  //Account found
  const match = await bycrypt.compare(loginData.password, account.password);
  if (!match) {
    res.sendFile(__dirname + "/views/incorrect.html");
    return;
  }
  req.session.user = account;
  req.session.loggedIn = true;
  res.sendFile(__dirname + "/views/logindone.html");
});
app.get("/logout", (req, res) => {
  res.clearCookie("visited");
  req.session.loggedIn = false;
  res.sendFile(__dirname + "/views/logout.html");
});

app.listen(port, () => {
  console.log(
    `Server running on port ${port} : http://localhost:3000/register`
  );
});
