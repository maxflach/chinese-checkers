import { useRef, useEffect, useCallback } from 'react';
import { BoardRenderer } from '@/lib/board/BoardRenderer';
import type { BoardState, MoveEvent } from '@/lib/board/types';

interface GameCanvasProps {
  boardState: BoardState | null;
  currentPlayerUid: string;
  onMove: (move: MoveEvent) => void;
}

export function GameCanvas({ boardState, currentPlayerUid, onMove }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);

  const handleMove = useCallback(
    (move: MoveEvent) => {
      onMove(move);
    },
    [onMove],
  );

  // Initialize / destroy PixiJS renderer
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new BoardRenderer();
    rendererRef.current = renderer;
    renderer.init(containerRef.current, handleMove);

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [handleMove]);

  // Update renderer when board state changes
  useEffect(() => {
    if (rendererRef.current && boardState) {
      rendererRef.current.update(boardState, currentPlayerUid);
    }
  }, [boardState, currentPlayerUid]);

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full touch-none"
      style={{ minHeight: 0 }}
    />
  );
}
