const mongoose = require('mongoose');

const canvasSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, default: 'Untitled canvas' },
    description: { type: String, default: '', maxlength: 500 },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Remembered camera position so reopening a canvas restores the exact view (PRD 47).
    viewport: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      zoom: { type: Number, default: 1 },
    },

    thumbnailUrl: { type: String, default: '' },
    lastOpenedAt: { type: Date, default: Date.now },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Canvas', canvasSchema);