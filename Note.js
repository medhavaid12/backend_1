const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  userId: String,
  userEmail: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date
});

module.exports = mongoose.model('Note', noteSchema);
