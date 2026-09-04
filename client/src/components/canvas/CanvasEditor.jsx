'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CalendarCheck, UploadCloud } from 'lucide-react';

import useSaveQueue from '@/hooks/useSaveQueue';
import useCanvasUploads from '@/hooks/useCanvasUploads';
import { canvasApi } from '@/lib/canvasApi';
import { isDueToday, todayKey } from '@/lib/dates';
import { defaultSizeFor, toFlowEdge, toFlowNode } from '@/lib/graph';
import { deleteAsset, looksLikeUrl } from '@/lib/uploadApi';
import { CanvasProvider } from './CanvasContext';
import CanvasTopBar from './CanvasTopBar';
import CanvasToolbar from './CanvasToolbar';
import FileViewer from './FileViewer';
import NodeInspector from './NodeInspector';
import TodayPanel from './TodayPanel';
import UploadProgress from './UploadProgress';
import RelationshipEditor from './RelationshipEditor';
import RelationshipEdge from './edges/RelationshipEdge';
import FileNode from './nodes/FileNode';
import ImageNode from './nodes/ImageNode';
import LinkNode from './nodes/LinkNode';
import NoteNode from './nodes/NoteNode';
import VideoNode from './nodes/VideoNode';

// Defined at module scope: React Flow warns (and re-renders hard) if these
// object identities change between renders.
const nodeTypes = {
  note: NoteNode,
  text: NoteNode,
  image: ImageNode,
  file: FileNode,
  video: VideoNode,
  link: LinkNode,
};
const edgeTypes = { relationship: RelationshipEdge };

const DELETE_KEYS = ['Backspace', 'Delete'];

/** Editor-side node patch -> API body. */
function toNodeApiPatch(patch) {
  const body = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.content !== undefined) body.content = patch.content;
  if (patch.tags !== undefined) body.tags = patch.tags;
  if (patch.type !== undefined) body.type = patch.type;
  if (patch.metadata !== undefined) body.metadata = patch.metadata;
  if (patch.color !== undefined) body.style = { color: patch.color };
  // Planning fields.
  if (patch.intent !== undefined) body.intent = patch.intent;
  if (patch.done !== undefined) body.done = patch.done;
  if (patch.dueDate !== undefined) body.dueDate = patch.dueDate;
  if (patch.confidence !== undefined) body.confidence = patch.confidence;
  return body;
}

function CanvasFlow({ canvas, initialNodes, initialEdges }) {
  const canvasId = String(canvas._id);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [name, setName] = useState(canvas.name);
  const [editingId, setEditingId] = useState(null); // node in text-edit mode
  const [connectionDraft, setConnectionDraft] = useState(null); // pending link
  const [editingEdgeId, setEditingEdgeId] = useState(null);
  const [viewerItem, setViewerItem] = useState(null); // asset open in the overlay
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [todayOpen, setTodayOpen] = useState(false);
  const [dimOthers, setDimOthers] = useState(false);
  const [inspectorHidden, setInspectorHidden] = useState(false);
  const [error, setError] = useState('');

  const { screenToFlowPosition, setCenter, getNode, getZoom } = useReactFlow();
  const { status, schedule, runNow } = useSaveQueue({ delay: 600 });

  const wrapperRef = useRef(null);
  // dragenter/dragleave fire for every child element the pointer crosses, so a
  // plain boolean flickers. Counting enters and leaves gives a stable answer.
  const dragDepthRef = useRef(0);

  // Geometry changes pile up here between flushes so a quick second drag can't
  // discard the first one - the scheduled fn drains whatever has accumulated.
  const geometryRef = useRef(new Map());

  // Read inside event handlers that fire after render (resize end), where the
  // `nodes` captured by the callback would be a render behind.
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const today = todayKey();

  const queueGeometry = useCallback(
    (entries) => {
      entries.forEach((entry) => {
        const existing = geometryRef.current.get(entry.id) ?? { id: entry.id };
        geometryRef.current.set(entry.id, { ...existing, ...entry });
      });

      schedule('geometry', () => {
        const batch = Array.from(geometryRef.current.values());
        geometryRef.current.clear();
        if (!batch.length) return Promise.resolve();
        return canvasApi.bulkUpdateNodes(canvasId, batch);
      });
    },
    [canvasId, schedule]
  );

  // --- nodes -------------------------------------------------------------

  const updateNodeData = useCallback(
    (id, patch) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
        )
      );
      schedule(`node:${id}`, () => canvasApi.updateNode(canvasId, id, toNodeApiPatch(patch)));
    },
    [canvasId, schedule, setNodes]
  );

  const toggleDone = useCallback(
    (id, next) => updateNodeData(id, { done: Boolean(next) }),
    [updateNodeData]
  );

  /**
   * Wraps React Flow's own change handler to persist resizes.
   *
   * NodeResizer streams `dimensions` changes with `resizing: true` for every
   * pixel of the drag, then emits exactly one with `resizing: false` when the
   * pointer goes up. Saving only that last one turns a 400-event drag into a
   * single request. Measurement changes from the ResizeObserver have no
   * `resizing` field at all, so `=== false` also filters those out - otherwise
   * every node would save its own size on first paint.
   */
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      const finished = changes.filter(
        (change) => change.type === 'dimensions' && change.resizing === false
      );
      if (!finished.length) return;

      queueGeometry(
        finished.map((change) => {
          const entry = { id: change.id };
          if (change.dimensions) {
            entry.size = {
              width: Math.round(change.dimensions.width),
              height: Math.round(change.dimensions.height),
            };
          }
          // Dragging a top or left handle moves the node as well as resizing
          // it, and the end event carries no position - so read the one the
          // earlier position changes already committed to state.
          const node = nodesRef.current.find((candidate) => candidate.id === change.id);
          if (node?.position) {
            entry.position = { x: Math.round(node.position.x), y: Math.round(node.position.y) };
          }
          return entry;
        })
      );
    },
    [onNodesChange, queueGeometry]
  );

  /** Adds an already-persisted node (from an upload or a link) to the view. */
  const adoptNode = useCallback(
    (created) => {
      setNodes((current) =>
        current.map((node) => ({ ...node, selected: false })).concat({ ...created, selected: true })
      );
      setError('');
    },
    [setNodes]
  );

  const createNode = useCallback(
    async (flowPosition, type = 'note', extra = {}) => {
      const size = defaultSizeFor(type);
      // Drop the node centred on the pointer rather than hanging off it.
      const position = {
        x: Math.round(flowPosition.x - size.width / 2),
        y: Math.round(flowPosition.y - size.height / 2),
      };

      try {
        const doc = await canvasApi.createNode(canvasId, { type, position, size, ...extra });
        const created = toFlowNode(doc);
        adoptNode(created);
        // Straight into typing, which is the whole point of double-click.
        if ((type === 'note' || type === 'text') && !extra.content) setEditingId(created.id);
        return created;
      } catch (err) {
        setError(err.message || 'Could not create that node');
        return null;
      }
    },
    [adoptNode, canvasId]
  );

  const onNodeDragStop = useCallback(
    (event, node, draggedNodes) => {
      const moved = draggedNodes?.length ? draggedNodes : [node];
      queueGeometry(moved.map((n) => ({ id: n.id, position: n.position })));
    },
    [queueGeometry]
  );

  const onNodesDelete = useCallback(
    (deleted) => {
      // React Flow has already dropped them locally (and their edges).
      deleted.forEach((node) => {
        geometryRef.current.delete(node.id);

        // Deleting an asset-backed node deletes the asset, which is what also
        // removes the file from disk. Calling deleteNode instead would leave
        // an orphaned upload sitting in server/uploads forever.
        if (node.data?.assetId) runNow(() => deleteAsset(node.data.assetId));
        else runNow(() => canvasApi.deleteNode(canvasId, node.id));
      });

      setEditingId((current) => (deleted.some((n) => n.id === current) ? null : current));
      setViewerItem((current) =>
        current && deleted.some((n) => n.data?.assetId === current.assetId) ? null : current
      );
    },
    [canvasId, runNow]
  );

  /** Selects a node and flies the viewport to it. */
  const focusNode = useCallback(
    (id) => {
      setNodes((current) => current.map((node) => ({ ...node, selected: node.id === id })));

      const node = getNode(id);
      if (!node) return;
      const width = node.measured?.width ?? node.width ?? 0;
      const height = node.measured?.height ?? node.height ?? 0;
      setCenter(node.position.x + width / 2, node.position.y + height / 2, {
        // Never zoom *out* to reach a node - if the user is reading at 1.5x,
        // yanking them back to 0.85x to show one card is disorienting.
        zoom: Math.max(getZoom(), 0.85),
        duration: 450,
      });
    },
    [getNode, getZoom, setCenter, setNodes]
  );

  // --- today view ---------------------------------------------------------

  const todayItems = useMemo(() => {
    const list = nodes
      .filter((node) => isDueToday(node.data?.dueDate, today))
      .map((node) => ({
        id: node.id,
        title: node.data?.title || node.data?.content || '',
        intent: node.data?.intent || 'none',
        dueDate: node.data.dueDate,
        done: Boolean(node.data?.done),
      }));

    // Outstanding before finished, then oldest first - the thing that has been
    // overdue longest is the thing that should be at the top of the list.
    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
    return list;
  }, [nodes, today]);

  const todayIds = useMemo(() => new Set(todayItems.map((item) => item.id)), [todayItems]);
  const todayOutstanding = todayItems.filter((item) => !item.done).length;
  const boardDone = nodes.filter((node) => node.data?.done).length;

  // Dimming is presentational only, so it is layered on here rather than
  // written into node state - otherwise `dimmed: true` would ride along in the
  // next autosave and end up in the database.
  const displayNodes = useMemo(() => {
    if (!todayOpen || !dimOthers) return nodes;
    return nodes.map((node) =>
      todayIds.has(node.id) ? node : { ...node, data: { ...node.data, dimmed: true } }
    );
  }, [dimOthers, nodes, todayIds, todayOpen]);

  // --- uploads, links and paste -------------------------------------------

  const { uploads, uploadFiles, addLink, dismissUpload } = useCanvasUploads({
    canvasId,
    onNodeCreated: adoptNode,
    onError: setError,
  });

  /** Flow coordinates of the middle of the visible canvas. */
  const centerPosition = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [screenToFlowPosition]);

  const onDragOver = useCallback((event) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    // Without preventDefault the browser navigates to the dropped file and the
    // drop event never reaches React.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDragEnter = useCallback((event) => {
    if (!event.dataTransfer?.types?.includes('Files')) return;
    dragDepthRef.current += 1;
    setIsDraggingFiles(true);
  }, []);

  const onDragLeave = useCallback(() => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFiles(false);
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFiles(false);

      // The node's top-left lands under the pointer. Centring would need the
      // final size, and the server decides that after reading the file.
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const files = Array.from(event.dataTransfer?.files || []);
      if (files.length) {
        uploadFiles(files, position);
        return;
      }

      // Dragging a link straight out of another tab's address bar.
      const uri = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain');
      if (uri && looksLikeUrl(uri)) addLink(uri.trim(), position);
    },
    [addLink, screenToFlowPosition, uploadFiles]
  );

  useEffect(() => {
    function onPaste(event) {
      // A paste into a note is an edit, not a canvas action.
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }
      if (editingId) return;

      const files = Array.from(event.clipboardData?.files || []);
      if (files.length) {
        event.preventDefault();
        uploadFiles(files, centerPosition());
        return;
      }

      const text = event.clipboardData?.getData('text/plain') || '';
      if (looksLikeUrl(text)) {
        event.preventDefault();
        addLink(text.trim(), centerPosition());
        return;
      }
      if (text.trim()) {
        event.preventDefault();
        createNode(centerPosition(), 'note', { content: text.trim() });
      }
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addLink, centerPosition, createNode, editingId, uploadFiles]);

  // --- edges -------------------------------------------------------------

  // Drawing a link doesn't commit it: the relationship editor decides.
  const onConnect = useCallback((connection) => setConnectionDraft(connection), []);

  const saveNewEdge = useCallback(
    async (values) => {
      const draft = connectionDraft;
      setConnectionDraft(null);
      if (!draft) return;

      try {
        const doc = await canvasApi.createEdge(canvasId, {
          source: draft.source,
          target: draft.target,
          metadata: {
            sourceHandle: draft.sourceHandle ?? null,
            targetHandle: draft.targetHandle ?? null,
          },
          ...values,
        });
        setEdges((current) => current.concat(toFlowEdge(doc)));
        setError('');
      } catch (err) {
        setError(err.message || 'Could not create that connection');
      }
    },
    [canvasId, connectionDraft, setEdges]
  );

  const saveEditedEdge = useCallback(
    async (values) => {
      const edgeId = editingEdgeId;
      setEditingEdgeId(null);
      if (!edgeId) return;

      try {
        const doc = await canvasApi.updateEdge(canvasId, edgeId, values);
        const updated = toFlowEdge(doc);
        setEdges((current) => current.map((edge) => (edge.id === edgeId ? updated : edge)));
        setError('');
      } catch (err) {
        setError(err.message || 'Could not update that connection');
      }
    },
    [canvasId, editingEdgeId, setEdges]
  );

  const deleteEdgeById = useCallback(
    async (edgeId) => {
      setEditingEdgeId(null);
      setEdges((current) => current.filter((edge) => edge.id !== edgeId));
      try {
        await canvasApi.deleteEdge(canvasId, edgeId);
      } catch (err) {
        setError(err.message || 'Could not delete that connection');
      }
    },
    [canvasId, setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted) => {
      deleted.forEach((edge) => runNow(() => canvasApi.deleteEdge(canvasId, edge.id)));
    },
    [canvasId, runNow]
  );

  // --- canvas ------------------------------------------------------------

  const onMoveEnd = useCallback(
    (event, viewport) => {
      schedule('viewport', () => canvasApi.updateCanvas(canvasId, { viewport }));
    },
    [canvasId, schedule]
  );

  const renameCanvas = useCallback(
    (next) => {
      setName(next);
      schedule('name', () => canvasApi.updateCanvas(canvasId, { name: next }));
    },
    [canvasId, schedule]
  );

  // Double-click on empty canvas creates a note (zoomOnDoubleClick is off so
  // this doesn't fight React Flow's default zoom gesture).
  const onDoubleClick = useCallback(
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.classList.contains('react-flow__pane')) return;
      createNode(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [createNode, screenToFlowPosition]
  );

  const canvasActions = useMemo(
    () => ({
      editingId,
      beginEditing: setEditingId,
      endEditing: () => setEditingId(null),
      updateNodeData,
      toggleDone,
      editEdge: setEditingEdgeId,
      openViewer: setViewerItem,
    }),
    [editingId, toggleDone, updateNodeData]
  );

  const editingEdge = editingEdgeId ? edges.find((edge) => edge.id === editingEdgeId) : null;

  // The inspector edits one node. With a multi-selection there is no single
  // answer to show, so it stays closed rather than silently editing the first.
  const selected = nodes.filter((node) => node.selected);
  const inspectorNode = selected.length === 1 ? selected[0] : null;
  const inspectorId = inspectorNode?.id ?? null;

  // Closing the panel shouldn't keep it closed for the *next* node you pick.
  useEffect(() => {
    setInspectorHidden(false);
  }, [inspectorId]);

  // Only auto-fit when the canvas has content but no meaningful saved viewport.
  const savedViewport = canvas.viewport ?? { x: 0, y: 0, zoom: 1 };
  const shouldFitView =
    initialNodes.length > 0 &&
    savedViewport.x === 0 &&
    savedViewport.y === 0 &&
    savedViewport.zoom === 1;

  return (
    <CanvasProvider value={canvasActions}>
      <div className="flex h-screen flex-col">
        <CanvasTopBar name={name} onRename={renameCanvas} status={status}>
          <button
            type="button"
            onClick={() => setTodayOpen((open) => !open)}
            aria-pressed={todayOpen}
            title="Show what's due today"
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors',
              todayOpen
                ? 'bg-melon-50 text-melon-600'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
            ].join(' ')}
          >
            <CalendarCheck size={14} strokeWidth={2} />
            Today
            {todayOutstanding ? (
              <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-melon-500 px-1 text-[10px] font-semibold tabular-nums text-white">
                {todayOutstanding}
              </span>
            ) : null}
          </button>
        </CanvasTopBar>

        {error ? (
          <div className="z-20 flex items-start gap-3 border-b border-melon-200 bg-melon-50 px-4 py-2 text-[13px] text-melon-700">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 font-medium underline underline-offset-2 hover:text-melon-900"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div
          ref={wrapperRef}
          className="group/canvas relative min-h-0 flex-1"
          onDoubleClick={onDoubleClick}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onConnect={onConnect}
            onMoveEnd={onMoveEnd}
            onPaneClick={() => setEditingId(null)}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            // Loose lets any side-handle be both start and end of a link.
            connectionMode={ConnectionMode.Loose}
            defaultViewport={savedViewport}
            fitView={shouldFitView}
            minZoom={0.2}
            maxZoom={2.5}
            zoomOnDoubleClick={false}
            deleteKeyCode={DELETE_KEYS}
            // Cmd/Ctrl-click adds to the selection, Shift-drag draws a marquee.
            multiSelectionKeyCode={['Meta', 'Control']}
            selectionKeyCode="Shift"
            proOptions={{ hideAttribution: false }}
            className="bg-canvas"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.6} color="#d3d3cf" />
          </ReactFlow>

          {nodes.length === 0 && !isDraggingFiles ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <p className="rounded-full border border-ink-100 bg-surface/90 px-4 py-2 text-[13px] text-ink-400 shadow-card backdrop-blur">
                Double-click to add a note, or drop a file anywhere
              </p>
            </div>
          ) : null}

          {isDraggingFiles ? (
            <div className="pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-melon-300 bg-melon-50/70 backdrop-blur-[2px]">
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-melon-600">
                <UploadCloud size={17} strokeWidth={2} />
                Drop to add to this canvas
              </p>
            </div>
          ) : null}

          {todayOpen ? (
            <TodayPanel
              items={todayItems}
              boardDone={boardDone}
              boardTotal={nodes.length}
              dimOthers={dimOthers}
              onToggleDim={() => setDimOthers((value) => !value)}
              onFocus={focusNode}
              onToggle={toggleDone}
              onClose={() => {
                setTodayOpen(false);
                // Leaving the board dimmed with no panel to explain why would
                // look like a rendering bug.
                setDimOthers(false);
              }}
            />
          ) : null}

          {inspectorNode && !inspectorHidden ? (
            <NodeInspector
              key={inspectorNode.id}
              node={inspectorNode}
              onChange={(patch) => updateNodeData(inspectorNode.id, patch)}
              onClose={() => setInspectorHidden(true)}
            />
          ) : null}

          <CanvasToolbar
            onAddNote={() => createNode(centerPosition())}
            onFilesPicked={(files) => uploadFiles(files, centerPosition())}
            onAddLink={(url) => addLink(url, centerPosition())}
          />

          <UploadProgress uploads={uploads} onDismiss={dismissUpload} />
        </div>

        {connectionDraft ? (
          <RelationshipEditor
            mode="create"
            onCancel={() => setConnectionDraft(null)}
            onSave={saveNewEdge}
          />
        ) : null}

        {editingEdge ? (
          <RelationshipEditor
            mode="edit"
            initial={editingEdge.data}
            onCancel={() => setEditingEdgeId(null)}
            onSave={saveEditedEdge}
            onDelete={() => deleteEdgeById(editingEdge.id)}
          />
        ) : null}

        {viewerItem ? <FileViewer item={viewerItem} onClose={() => setViewerItem(null)} /> : null}
      </div>
    </CanvasProvider>
  );
}

/**
 * ReactFlowProvider has to sit above anything calling useReactFlow, so the
 * editor is split into a provider shell and the flow itself.
 */
export default function CanvasEditor({ canvas, nodes, edges }) {
  const initialNodes = useMemo(() => nodes.map(toFlowNode), [nodes]);
  const initialEdges = useMemo(() => edges.map(toFlowEdge), [edges]);

  return (
    <ReactFlowProvider>
      <CanvasFlow canvas={canvas} initialNodes={initialNodes} initialEdges={initialEdges} />
    </ReactFlowProvider>
  );
}
