const mongoose = require("mongoose");

const NoteSchema = mongoose.Schema({
  content: {
    type: String,
    minLength: 4,
    require: true,
  },
});

const Notes = mongoose.model("Notes", NoteSchema);

module.exports = Notes;
