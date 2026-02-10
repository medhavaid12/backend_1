const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Note = require('../models/Note');
const { sendNoteCreatedEmail } = require('../services/emailService');

// In-memory fallback
let notesInMemory = [];
let noteId = 1;

/* =========================
   CREATE NOTE
========================= */
router.post('/', async (req, res) => {
  const { text, userId, userEmail } = req.body;

  if (!text || !userId) {
    return res.status(400).json({ error: 'text and userId are required' });
  }

  try {
    // DB MODE
    if (mongoose.connection.readyState === 1) {
      const note = await Note.create({ text, userId, userEmail });

      let previewUrl = null;
      if (userEmail) {
        try {
          const emailResult = await sendNoteCreatedEmail(
            userEmail,
            text,
            note._id
          );
          if (emailResult?.success) {
            note.emailSent = true;
            note.emailSentAt = new Date();
            await note.save();
            previewUrl = emailResult.previewUrl || null;
          }
        } catch (e) {
          console.error('Email failed:', e.message);
        }
      }

      return res.status(201).json({
        ...note.toObject(),
        previewUrl,
        message: 'Note created successfully'
      });
    }

    // FALLBACK MODE
    const inMemNote = {
      _id: noteId++,
      text,
      userId,
      userEmail,
      createdAt: new Date(),
      emailSent: false
    };
    notesInMemory.push(inMemNote);

    res.status(201).json({
      ...inMemNote,
      message: 'Note created successfully (demo mode)'
    });

  } catch (err) {
    console.error('Create note error:', err.message);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/* =========================
   GET NOTES
========================= */
router.get('/', async (req, res) => {
  const userId = req.query.userId || req.user?.uid;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const notes = await Note.find({ userId }).sort({ createdAt: -1 });
      return res.json(notes);
    }

    const notes = notesInMemory
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(notes);

  } catch (err) {
    console.error('Fetch notes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

/* =========================
   DELETE NOTE
========================= */
router.delete('/:id', async (req, res) => {
  const userId = req.body.userId || req.user?.uid;
  const noteIdParam = req.params.id;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const deleted = await Note.findOneAndDelete({
        _id: noteIdParam,
        userId
      });

      if (!deleted) {
        return res.status(404).json({ error: 'Note not found' });
      }

      return res.json({ message: 'Note deleted successfully' });
    }

    const index = notesInMemory.findIndex(
      n => String(n._id) === String(noteIdParam) && n.userId === userId
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Note not found' });
    }

    notesInMemory.splice(index, 1);
    res.json({ message: 'Note deleted successfully (demo mode)' });

  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
