import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
}: EdgeProps) {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? '#3b82f6' : '#2a2a3a',
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: selected ? '0' : '5 4',
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
      />
      {/* Delete button floats at edge midpoint on hover/select */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            onClick={onDelete}
            title="Delete edge"
            className={`
              flex items-center justify-center w-5 h-5 rounded-full
              bg-[#1a1a1f] border border-[#2a2a30]
              hover:bg-rose-500/20 hover:border-rose-500/50
              transition-all duration-150 shadow
              ${selected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100'}
            `}
            style={{ opacity: selected ? 1 : 0 }}
          >
            <X className="w-2.5 h-2.5 text-[#666] hover:text-rose-400" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
