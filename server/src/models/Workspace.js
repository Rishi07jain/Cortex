const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    color: { type: String, default: '#e2445c' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Workspace', workspaceSchema);