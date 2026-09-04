const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    canvas: { type: mongoose.Schema.Types.ObjectId, ref: 'Canvas', default: null },
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    fileName: { type: String, required: true },   // stored name on disk
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    url: { type: String, required: true },        // public path the client loads
    thumbnailUrl: { type: String, default: '' },

    // PRD 20: Uploading -> Processing -> Ready
    processingStatus: {
      type: String,
      enum: ['uploading', 'processing', 'ready', 'failed'],
      default: 'ready',
    },

    extractedText: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Asset', assetSchema);