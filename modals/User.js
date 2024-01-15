const mongoose = require("mongoose");

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    require: true,
  },
  password: {
    type: String,
    required: true,
  },
});
const User = mongoose.model("User", UserSchema);
module.exports = User;
