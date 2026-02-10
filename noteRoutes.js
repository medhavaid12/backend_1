const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Note = require('../models/Note');
const { sendNoteCreatedEmail } = require('../services/emailService');

// In-memory storage fallback
let notesInMemory = [];
let noteId = 1;

router.post('/', async (req, res) => {
  try {
    if (!req.body.text) {
      return res.status(400).json({ error: 'Note text is required' });
    }

    const note = new Note({
      text: req.body.text,
      userId: req.body.userId,
      userEmail: req.body.userEmail
    });
    const savedNote = await note.save();

    // Send email notification
    let previewUrl = null;
    if (req.body.userEmail) {
      const emailResult = await sendNoteCreatedEmail(
        req.body.userEmail,
        req.body.text,
        savedNote._id
      );

      savedNote.emailSent = !!emailResult.success;
      if (emailResult.success) {
        savedNote.emailSentAt = new Date();
        await savedNote.save();
      }
      previewUrl = emailResult.previewUrl || null;
      if (previewUrl) console.log('Email preview URL for note', savedNote._id, previewUrl);
    }

    res.status(201).json({
      ...savedNote.toObject(),
      message: 'Note created successfully',
      previewUrl
    });
  } catch (err) {
    console.error('Error saving to DB:', err.message);
    // Fallback to in-memory storage
    const inMemNote = {
      _id: noteId++,
      text: req.body.text,
      userId: req.body.userId,
      userEmail: req.body.userEmail,
      createdAt: new Date(),
      emailSent: false,
      message: 'Note created successfully (demo mode)'
    };
    notesInMemory.push(inMemNote);

    // Attempt to send email even when using in-memory fallback
    let previewUrl = null;
    try {
      if (req.body.userEmail) {
        const emailResult = await sendNoteCreatedEmail(
          req.body.userEmail,
          req.body.text,
          inMemNote._id
        );
        inMemNote.emailSent = !!emailResult.success;
        if (emailResult.success) {
          inMemNote.emailSentAt = new Date();
        }
        previewUrl = emailResult.previewUrl || null;
        if (previewUrl) console.log('Email preview URL for in-memory note', inMemNote._id, previewUrl);
      }
    } catch (emailErr) {
      console.error('Error sending email for in-memory note:', emailErr && emailErr.message ? emailErr.message : emailErr);
    }

    res.status(201).json({
      ...inMemNote,
      previewUrl
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.uid || req.query.userId;
    const userEmail = req.user?.email || req.query.userEmail;

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'User ID and email required' });
    }

    let userNotes = [];
    if (mongoose.connection.readyState === 1) {
      userNotes = await Note.find({ userId }).sort({ createdAt: -1 });
    } else {
      userNotes = notesInMemory.filter(note => note.userId === userId);
    }

    console.log('Notes for user:', userId, userNotes);
    res.json(userNotes);
  } catch (err) {
    console.error('Error fetching notes:', err.message);
    // Return in-memory notes for user
    const userId = req.user?.uid || req.query.userId;
    const userNotes = userId ? notesInMemory.filter(note => note.userId === userId) : [];
    console.log('Returning in-memory notes for user:', userId, userNotes);
    res.json(userNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.uid || req.body.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    let deletedNote;
    if (mongoose.connection.readyState === 1) {
      deletedNote = await Note.findOneAndDelete({
        _id: req.params.id,
        userId
      });
    } else {
      // Use in-memory storage
      const noteIndex = notesInMemory.findIndex(note => note._id === parseInt(req.params.id) && note.userId === userId);
      if (noteIndex !== -1) {
        deletedNote = notesInMemory.splice(noteIndex, 1)[0];
      }
    }

    if (!deletedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Error deleting note:', err.message);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
