const express = require("express");
const mongoose = require("mongoose");
const User = require("./modals/User.js");
const bycrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const Notes = require("./modals/Note.js");

const app = express();
const port = 3000;

const secretKey = "secret-key";

mongoose.connect("mongodb://127.0.0.1:27017/userRegister");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    // name: "user-cookie",
    secret: "secret-key",
    cookie: {
      maxAge: 1000 * 60 * 10, //10 minutes
    },
  })
);
//------------------------------------------------ TOKEN ----------------------------------------

if (typeof localStorage === "undefined" || localStorage === null) {
  let LocalStorage = require("node-localstorage").LocalStorage;
  localStorage = new LocalStorage("./scratch");
}

const authenticateToken = (req, res, next) => {
  const token = localStorage.getItem("access_token");
  // console.log(token);

  if (!token) {
    res.status(401).send("Login to access Notes");
  }
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res
        .status(403)
        .send(
          `<h1 style="font-size:50px; text-align:center">Token expires, please login again!</h1>`
        );
    }
    req.user = user;
    next();
  });
};

app.set("view engine", "hbs");

//------------------------------------------------------- NOTES --------------------------------------

app.get("/notes", authenticateToken, (req, res) => {
  res.render("notes", { user: req.user });
  const loggedIn = req.session.loggedIn;
  if (loggedIn) {
    res.cookie("visited", true);
  } else {
    res.send(
      `<h1 style="text-align:center">Session logged out! Login again</h1>`
    );
  }
});
//------------------------------------------------------ REGISTRATION ------------------------------

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/views/SignUp/SignUp.html");
});
app.post("/register", async (req, res) => {
  const user = req.body;

  if (!user.password || !user.username) {
    res.send(`<h1>Username & Password are required</h1>`);
  }
  if (user.password.length < 4) {
    res.send(`<h1 style="text-align:center">Password length must be >= 4</h1>`);
  }
  const username = req.body.username;
  const userExist = await User.findOne({ username });

  if (userExist) {
    res.send(
      `<h1 style="font-size:50px;text-align:center">Username already exist`
    );
    return;
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
    res.send(
      `<h1 style="font-size:50px;text-align:center">Couldn't register account</h1>`
    );
  }
});
//--------------------------------------------------------- LOGIN --------------------------------

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/views/Login/Login.html");
});
app.post("/login", async (req, res) => {
  const loginData = req.body;
  const account = (
    await User.find().where("username").equals(loginData.username)
  )[0];
  if (!account) {
    res.send(
      `<h1 style="text-align:center">No such account, check password & username</h1>`
    );
    return;
  }
  //Account found
  const match = await bycrypt.compare(loginData.password, account.password);
  if (!match) {
    res.sendFile(__dirname + "/views/incorrect.html");
    return;
  }
  const token = jwt.sign({ username: account.username }, secretKey, {
    expiresIn: "300s",
  });

  localStorage.setItem("access_token", token);
  console.log(localStorage.getItem("access_token"));
  res.status(201).sendFile(__dirname + "/views/logindone.html");
  req.session.user = account;
  req.session.loggedIn = true;
});
//--------------------------------------------------- LOGOUT -------------------------------

app.get("/logout", (req, res) => {
  res.clearCookie("visited");
  req.session.loggedIn = false;
  res.sendFile(__dirname + "/views/logout.html");
});
//--------------------------------------------------- ADD NOTE ------------------------------

app.post("/addnote", async (req, res) => {
  try {
    const content = req.body.content;
    const newNote = new Notes({ content });
    await newNote.save();
    res.send("Note created successfully");
  } catch (err) {
    res.status(400).send(`Could not create a note`);
  }
});
//--------------------------------------------------- DELETE NOTE ----------------------------

app.post("/deletenote", async (req, res) => {
  try {
    const id = req.body.noteId;
    await Notes.findByIdAndDelete(id);
    res.send("Note deleted successfully");
  } catch {
    res.status(400).send("Could not delete note");
  }
});
//--------------------------------------------------- GET NOTES -----------------------------

app.get("/getnotes", async (req, res) => {
  try {
    const notes = await Notes.find();
    res.render("notes", { notes });
  } catch (err) {
    res.status(500).send("Internal server error!");
  }
});
//----------------------------------------------------- SERVER ------------------------------

app.listen(port, () => {
  console.log(
    `Server running on port ${port} : http://localhost:3000/register`
  );
});
