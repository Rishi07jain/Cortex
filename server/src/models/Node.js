const mongoose = require('mongoose');

// PRD section 17 - what a node *is* (which component renders it).
const NODE_TYPES = ['text', 'file', 'image', 'video', 'link', 'person', 'event', 'note'];

/**
 * What a node is *for*, which is a different question from what it is.
 *
 * type answers "how do I render this" - a PDF, an image, a note.
 * intent answers "what job does this do in my plan" - is that PDF a Resource
 * to read, or the Practice paper you're going to sit?
 *
 * They're deliberately orthogonal: any type can carry any intent. That's what
 * turns the board from a pile of material into a plan, and it's what the goal
 * coverage view reads to work out which topics still have gaps.
 */
const NODE_INTENTS = [
  'none',
  'topic', // a subject area: "Constituency Grammar"
  'concept', // a specific idea to understand: "CYK algorithm"
  'resource', // something to consume: lecture PDF, video, textbook chapter
  'note', // your own writing about a topic
  'practice', // questions, problem sets, past papers
  'revision', // a deliberate second pass over something already learned
  'key', // a formula or fact worth surfacing: "⭐ important"
  'task', // a discrete action: "watch lecture 4"
  'goal', // the destination: "NLP Module 3 - End Semester"
];

const nodeSchema = new mongoose.Schema(
  {
    canvas: { type: mongoose.Schema.Types.ObjectId, ref: 'Canvas', required: true, index: true },
    type: { type: String, enum: NODE_TYPES, default: 'text' },
    intent: { type: String, enum: NODE_INTENTS, default: 'none' },

    title: { type: String, default: '', maxlength: 200 },
    content: { type: String, default: '' },

    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    size: {
      width: { type: Number, default: 240 },
      height: { type: Number, default: 140 },
    },

    style: {
      color: { type: String, default: '' },
    },

    tags: [{ type: String, trim: true, lowercase: true }],

    // --- planning ---------------------------------------------------------

    // The checkbox on every node.
    done: { type: Boolean, default: false },
    // When it was ticked. Kept separately so a future "what did I get through
    // last week" view doesn't need an audit log.
    doneAt: { type: Date, default: null },

    /**
     * Optional due date, stored as a plain "YYYY-MM-DD" string rather than a Date.
     *
     * This is deliberate. A Date is a precise instant in UTC, but "due Friday"
     * is not an instant - it's a day, and which day it is depends on where you
     * are standing. Storing it as a Date means midnight in Kolkata is 18:30 the
     * previous day in UTC, so Mongo says Thursday while the user says Friday,
     * and the "today" view quietly shows yesterday's work. Storing the calendar
     * day as a string makes "is this due today?" a string comparison against
     * the browser's own local date, which cannot drift.
     */
    dueDate: {
      type: String,
      default: '',
      validate: {
        validator: (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
        message: 'dueDate must be an empty string or YYYY-MM-DD',
      },
    },

    // Self-rated 1-5 after an active-recall pass; 0 means never rated.
    // Written by the practice loop; harmless until then.
    confidence: { type: Number, min: 0, max: 5, default: 0 },

    // Free-form per-type extras: link url/domain, file size, recall steps...
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', default: null },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },

    collapsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Powers in-canvas search (PRD 24).
nodeSchema.index({ title: 'text', content: 'text', tags: 'text' });
// Powers the today view: "what's due on this board, oldest first".
nodeSchema.index({ canvas: 1, dueDate: 1 });

module.exports = mongoose.model('Node', nodeSchema);
module.exports.NODE_TYPES = NODE_TYPES;
module.exports.NODE_INTENTS = NODE_INTENTS;
