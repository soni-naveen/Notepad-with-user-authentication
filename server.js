const express = require("express");
const mongoose = require("mongoose");
const User = require("./modals/User.js");
const bcrypt = require("bcrypt");
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
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 10, // 10 minutes
    },
  })
);
//------------------------------------- TOKEN ----------------------------------------

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

//---------------------------------- NOTES --------------------------------------

app.get("/notes", authenticateToken, (req, res) => {
  res.render("notes", { user: req.user });
  const loggedIn = req.session.loggedIn;
  if (loggedIn) {
    res.cookie("visited", true);
  } else {
    res.send(
      `<script> alert("Session logged out! Login again"); window.location.href = "/login"; </script>`
    );
  }
});
//--------------------------------- REGISTRATION --------------------------------

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/views/SignUp/SignUp.html");
});
app.post("/register", async (req, res) => {
  const user = req.body;

  if (!user.password || !user.username) {
    res.send(`<h1>Username & Password are required</h1>`);
  }
  if (user.password.length < 4) {
    res.send(
      `<script> alert("Password length must be >= 4"); window.location.href = "/register"; </script>`
    );
  }
  const username = req.body.username;
  const userExist = await User.findOne({ username });

  if (userExist) {
    res.send(
      `<script> alert("username already exist!"); window.location.href = "/register"; </script>`
    );
    return;
  }

  const newUser = new User(user);
  const saltRounds = 10;
  //naveen -----> encrypt ----> shfowewineinfeoiewnfie
  const hashedPwd = await bcrypt.hash(newUser.password, saltRounds);
  newUser.password = hashedPwd;

  try {
    await newUser.save();
    res.send(
      `<script> alert("Registered successfully!"); window.location.href = "/login"; </script>`
    );
  } catch (err) {
    res.send(
      `<script> alert("Could not register account"); window.location.href = "/register"; </script>`
    );
  }
});
//----------------------------- LOGIN --------------------------------

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
      `<script> alert("No such account, check password & username"); window.location.href = "/login"; </script>`
    );
    return;
  }
  //Account found
  const match = await bcrypt.compare(loginData.password, account.password);
  if (!match) {
    res.send(
      `<script> alert("INCORRECT Password"); window.location.href = "/login"; </script>`
    );
    return;
  }
  const token = jwt.sign({ username: account.username }, secretKey, {
    expiresIn: "300s",
  });

  localStorage.setItem("access_token", token);
  // console.log(localStorage.getItem("access_token"));
  res.status(201).sendFile(__dirname + "/views/logindone.html");

  req.session.user = account;
  req.session.loggedIn = true;
});
//------------------------------ LOGOUT -------------------------------

app.get("/logout", (req, res) => {
  res.clearCookie("visited");
  req.session.loggedIn = false;
  res.send(
    `<script> alert("Logout successfully"); window.location.href = "/login"; </script>`
  );
});
//------------------------------ ADD NOTE ------------------------------

app.post("/addnote", async (req, res) => {
  try {
    const content = req.body.content;
    const newNote = new Notes({ content });
    await newNote.save();
    res.send(
      `<script> alert("Note created successfully"); window.location.href = "/notes"; </script>`
    );
  } catch (err) {
    res
      .status(400)
      .send(
        `<script>alert("Could not create a note"); window.location.href = "/notes"; </script>`
      );
  }
});
//----------------------------- DELETE NOTE ----------------------------

app.post("/deletenote", async (req, res) => {
  try {
    const id = req.body.noteId;
    await Notes.findByIdAndDelete(id);
    res.send(
      `<script> alert("Note deleted successfully"); window.location.href = "/getnotes"; </script>`
    );
  } catch {
    res
      .status(400)
      .send(
        `<script> alert("Could not delete note"); window.location.href = "/getnotes"; </script>`
      );
  }
});
//------------------------------ GET NOTES -----------------------------

app.get("/getnotes", async (req, res) => {
  try {
    const notes = await Notes.find();
    res.render("notes", { notes });
  } catch (err) {
    res.status(500).send("Internal server error!");
  }
});
//------------------------------ SERVER --------------------------------

app.listen(port, () => {
  console.log(
    `Server running on port ${port} : http://localhost:3000/register`
  );
});
