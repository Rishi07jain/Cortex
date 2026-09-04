const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    canvas: { type: mongoose.Schema.Types.ObjectId, ref: 'Canvas', required: true, index: true },
    title: { type: String, default: 'Group', maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    color: { type: String, default: '#94a3b8' },

    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    size: {
      width: { type: Number, default: 480 },
      height: { type: Number, default: 320 },
    },

    collapsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);