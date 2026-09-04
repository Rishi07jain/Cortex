import {
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  ClipboardList,
  FileText,
  PenLine,
  RotateCcw,
  Star,
  Target,
} from 'lucide-react';

/**
 * Node intent: what a node is *for*, as opposed to what it *is*.
 *
 * `type` decides which component renders a node (image, file, note). `intent`
 * decides what job it does in your plan. They're independent on purpose - the
 * same lecture PDF is a Resource on Monday and Revision the week before the
 * exam, without changing what it is.
 *
 * The order here is the order shown in the picker, and it runs roughly in the
 * order you'd actually work: understand the topic, gather material, write it
 * up, practise it, revise it, then sit the thing.
 *
 * `emoji` is unused by the UI, which draws the lucide `icon` instead so the
 * badges match the rest of the app rather than rendering differently on every
 * OS. It's kept here so switching to emoji is a one-line change in NodeShell.
 */
export const NODE_INTENTS = [
  {
    value: 'none',
    label: 'No intent',
    short: 'None',
    emoji: '',
    icon: Circle,
    color: '#b0b0aa',
    hint: 'Just a node. No role in the plan yet.',
  },
  {
    value: 'topic',
    label: 'Topic',
    short: 'Topic',
    emoji: '📚',
    icon: BookOpen,
    color: '#5b7cc4',
    hint: 'A subject area you need to cover, e.g. "Constituency Grammar".',
  },
  {
    value: 'concept',
    label: 'Concept',
    short: 'Concept',
    emoji: '🧠',
    icon: Brain,
    color: '#8a7cc2',
    hint: 'One idea to actually understand, e.g. "CYK algorithm".',
  },
  {
    value: 'resource',
    label: 'Resource',
    short: 'Resource',
    emoji: '📄',
    icon: FileText,
    color: '#4a95b8',
    hint: 'Material to consume: lecture PDF, slides, video, textbook chapter.',
  },
  {
    value: 'note',
    label: 'Note',
    short: 'Note',
    emoji: '✍️',
    icon: PenLine,
    color: '#667a8a',
    hint: 'Your own writing about a topic, in your own words.',
  },
  {
    value: 'practice',
    label: 'Practice',
    short: 'Practice',
    emoji: '📝',
    icon: ClipboardList,
    color: '#d9834a',
    hint: 'Questions, problem sets, past papers - anything you attempt.',
  },
  {
    value: 'revision',
    label: 'Revision',
    short: 'Revision',
    emoji: '🔁',
    icon: RotateCcw,
    color: '#3fa08a',
    hint: 'A deliberate second pass over something you already learned once.',
  },
  {
    value: 'key',
    label: 'Key information',
    short: 'Key',
    emoji: '⭐',
    icon: Star,
    color: '#d8a02c',
    hint: 'A formula, definition or fact worth surfacing above the rest.',
  },
  {
    value: 'task',
    label: 'Task',
    short: 'Task',
    emoji: '✅',
    icon: CheckCircle2,
    color: '#3f9a56',
    hint: 'A discrete action to do, e.g. "watch lecture 4".',
  },
  {
    value: 'goal',
    label: 'Goal',
    short: 'Goal',
    emoji: '🎯',
    icon: Target,
    color: '#e2445c',
    hint: 'The destination, e.g. "NLP Module 3 — End Semester".',
  },
];

const BY_VALUE = new Map(NODE_INTENTS.map((intent) => [intent.value, intent]));

/** Always returns an intent object - unknown or missing values fall back to 'none'. */
export function intentFor(value) {
  return BY_VALUE.get(value) || BY_VALUE.get('none');
}

/** True for intents worth drawing a badge for ('none' isn't). */
export function hasIntent(value) {
  return Boolean(value) && value !== 'none' && BY_VALUE.has(value);
}

/**
 * Which intents count as "covering" a topic, and in what order the coverage
 * table shows them. Read by the goal coverage view.
 */
export const COVERAGE_INTENTS = ['resource', 'note', 'practice', 'revision'];
