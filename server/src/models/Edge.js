const mongoose = require('mongoose');

// PRD section 18 - relationship types. "custom" lets the user type their own label.
const RELATIONSHIP_TYPES = [
  'related-to',
  'works-at',
  'founded',
  'mentions',
  'supports',
  'contradicts',
  'caused',
  'located-at',
  'happened-before',
  'happened-after',
  'references',
  'custom',
];

const edgeSchema = new mongoose.Schema(
  {
    canvas: { type: mongoose.Schema.Types.ObjectId, ref: 'Canvas', required: true, index: true },
    source: { type: mongoose.Schema.Types.ObjectId, ref: 'Node', required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'Node', required: true },

    label: { type: String, default: '', maxlength: 120 },
    relationshipType: { type: String, enum: RELATIONSHIP_TYPES, default: 'related-to' },
    direction: { type: String, enum: ['forward', 'backward', 'both', 'none'], default: 'forward' },

    style: {
      color: { type: String, default: '' },
      thickness: { type: Number, default: 2 },
      dashed: { type: Boolean, default: false },
    },

    confidence: { type: Number, min: 0, max: 1, default: 1 },

    // AI-proposed edges stay visibly marked until the user accepts them (PRD 28).
    isSuggestion: { type: Boolean, default: false },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Edge', edgeSchema);
module.exports.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;